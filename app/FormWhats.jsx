'use client';
import { useEffect, useRef, useState } from 'react';
import IconeWhats from './IconeWhats';
import { trackWhatsApp } from '../lib/track';

// Mini formulário que abre ao tocar em "WhatsApp".
// A pessoa deixa nome e WhatsApp; o SDR chama ela em instantes (mesmo fluxo dos leads de portal).
// O evento "Contact" do Pixel só dispara quando ela ENVIA o formulário — é ele que a campanha otimiza.

const LEMBRAR = 'jd_contato_form';

function utmDaUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const u = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => { if (p.get(k)) u[k] = p.get(k).slice(0, 80); });
    if (Object.keys(u).length) { try { sessionStorage.setItem('jd_utm', JSON.stringify(u)); } catch (e) {} return u; }
    return JSON.parse(sessionStorage.getItem('jd_utm') || '{}');
  } catch (e) { return {}; }
}

// (83) 99999-9999 enquanto digita; com + no início não mexe (número de fora do Brasil)
function mascara(v) {
  if (/^\s*\+/.test(v)) return v.replace(/[^\d+\s()-]/g, '').slice(0, 20);
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function FormWhats({ aberto, onFechar, im, wa }) {
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [hp, setHp] = useState(''); // armadilha para robô (campo invisível)
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const abriuEm = useRef(0);
  const primeiroCampo = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    abriuEm.current = Date.now();
    setErro(''); setOk(false);
    try {
      const salvo = JSON.parse(localStorage.getItem(LEMBRAR) || '{}');
      if (salvo.nome && !nome) setNome(salvo.nome);
      if (salvo.tel && !tel) setTel(salvo.tel);
    } catch (e) {}
    const t = setTimeout(() => primeiroCampo.current?.focus(), 50);
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  if (!aberto) return null;

  const digitos = tel.replace(/\D/g, '');
  const internacional = /^\s*\+/.test(tel) && !digitos.startsWith('55');
  const telOk = internacional ? digitos.length >= 8 && digitos.length <= 15 : (digitos.length === 10 || digitos.length === 11 || ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')));
  const nomeOk = nome.trim().length >= 2;

  const enviar = async (e) => {
    e.preventDefault();
    if (!nomeOk) { setErro('Digite seu nome.'); return; }
    if (!telOk) { setErro('Confira o WhatsApp com DDD. Ex.: (83) 99999-9999'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await fetch('/api/leads/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(), telefone: tel.trim(), codigo: im?.codigo || null,
          pagina: typeof window !== 'undefined' ? window.location.pathname : '',
          utm: utmDaUrl(), hp, ms: Date.now() - abriuEm.current,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.erro || 'Não consegui enviar agora. Tente de novo.');
      try { localStorage.setItem(LEMBRAR, JSON.stringify({ nome: nome.trim(), tel: tel.trim() })); } catch (e2) {}
      trackWhatsApp(im || {});
      setOk(true);
    } catch (e2) {
      setErro(e2.message || 'Não consegui enviar agora. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const campo = { width: '100%', background: '#fff', color: '#1F1812', border: '1px solid rgba(31,24,18,.18)', borderRadius: 10, padding: '13px 14px', fontSize: 16, outline: 'none' };
  const rotulo = { display: 'block', fontSize: 13, fontWeight: 600, color: '#5b4d3d', marginBottom: 6 };
  const primeiro = nome.trim().split(' ')[0];

  return (
    <div role="dialog" aria-modal="true" aria-label="Falar no WhatsApp" onClick={onFechar}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,11,8,.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }}>
      <div onClick={(e) => e.stopPropagation()} className="form-whats"
        style={{ width: '100%', maxWidth: 440, background: '#F7F2EA', color: '#1F1812', borderRadius: '18px 18px 0 0', padding: '22px 20px calc(22px + env(safe-area-inset-bottom))', boxShadow: '0 -10px 40px rgba(0,0,0,.35)', position: 'relative' }}>
        <button onClick={onFechar} aria-label="Fechar" style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 0, fontSize: 26, lineHeight: 1, color: '#7a6c59', cursor: 'pointer', padding: 6 }}>×</button>

        {ok ? (
          <div style={{ textAlign: 'center', padding: '10px 4px 4px' }}>
            <div style={{ width: 54, height: 54, margin: '0 auto 12px', borderRadius: 999, background: 'var(--wa)', display: 'grid', placeItems: 'center' }}><IconeWhats size={28} /></div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Pronto{primeiro ? `, ${primeiro}` : ''}!</div>
            <p style={{ fontSize: 14.5, color: '#5b4d3d', lineHeight: 1.5, margin: '8px 0 18px' }}>
              Em instantes você recebe nossa mensagem no WhatsApp{im?.codigo ? ` sobre o ${im.codigo}` : ''}.
            </p>
            <button onClick={onFechar} style={{ width: '100%', background: '#1F1812', color: '#F7F2EA', border: 0, borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Continuar vendo o imóvel</button>
            {wa && <a href={wa} target="_blank" rel="noopener" style={{ display: 'block', marginTop: 12, fontSize: 13.5, color: '#2b6b45', fontWeight: 700 }}>Prefere chamar agora? Abrir o WhatsApp</a>}
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <div style={{ fontSize: 19, fontWeight: 800, paddingRight: 28 }}>Fale com um corretor no WhatsApp</div>
            <p style={{ fontSize: 14, color: '#5b4d3d', lineHeight: 1.5, margin: '6px 0 16px' }}>
              Deixe seu nome e WhatsApp que um corretor te chama agora para tirar suas dúvidas{im?.codigo ? ` sobre o ${im.codigo}` : ''} e combinar uma visita, presencial ou por chamada de vídeo se você mora fora.
            </p>
            <label style={rotulo} htmlFor="fw-nome">Seu nome</label>
            <input id="fw-nome" ref={primeiroCampo} value={nome} onChange={(e) => setNome(e.target.value.slice(0, 80))} autoComplete="name" placeholder="Como podemos te chamar?" style={{ ...campo, marginBottom: 12 }} />
            <label style={rotulo} htmlFor="fw-tel">WhatsApp com DDD</label>
            <input id="fw-tel" value={tel} onChange={(e) => setTel(mascara(e.target.value))} type="tel" inputMode="tel" autoComplete="tel" placeholder="(83) 99999-9999" style={campo} />
            <div style={{ fontSize: 12, color: '#7a6c59', marginTop: 6 }}>Mora fora do Brasil? Comece com + e o código do país.</div>
            <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="empresa" aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            {erro && <div style={{ marginTop: 12, fontSize: 13.5, color: '#b42318', fontWeight: 600 }}>{erro}</div>}
            <button type="submit" disabled={enviando}
              style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--wa)', color: 'var(--wa-texto)', border: 0, borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 800, cursor: enviando ? 'wait' : 'pointer', opacity: enviando ? 0.75 : 1 }}>
              <IconeWhats size={20} />{enviando ? 'Enviando…' : 'Quero falar no WhatsApp'}
            </button>
            <div style={{ fontSize: 11.5, color: '#7a6c59', textAlign: 'center', marginTop: 10, lineHeight: 1.45 }}>
              Ao enviar, você aceita receber nosso contato pelo WhatsApp. Sem spam.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
