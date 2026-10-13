'use client';
import { useState } from 'react';

// Página do parceiro: sem logo, sem menu, sem link para o site.
export default function ParceiroClient({ token, im }) {
  const [copiado, setCopiado] = useState(false);
  const [aberta, setAberta] = useState(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(im.texto);
      setCopiado(true);
    } catch (e) {
      // navegadores antigos: seleciona o texto para a pessoa copiar
      const ta = document.getElementById('texto-parceiro');
      if (ta) { ta.focus(); ta.select(); try { document.execCommand('copy'); setCopiado(true); } catch (_) { /* nada */ } }
    }
    setTimeout(() => setCopiado(false), 2500);
  }

  const btn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '14px 18px', borderRadius: 12, fontSize: 14.5, fontWeight: 700, border: '1px solid rgba(232,168,124,.4)',
    background: 'rgba(232,168,124,.14)', color: 'var(--accent)', textDecoration: 'none', flex: '1 1 180px',
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 16px 60px' }}>
      <div style={{ fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--taupe)', fontWeight: 700 }}>Material do imóvel{im.codigo ? ` · ${im.codigo}` : ''}</div>
      <h1 style={{ fontSize: 26, margin: '8px 0 4px', color: 'var(--cream-2)', lineHeight: 1.2 }}>{im.titulo}</h1>
      <div style={{ color: 'var(--sand)', fontSize: 15 }}>{im.bairro}, {im.cidade} · <strong style={{ color: 'var(--cream-2)' }}>{im.preco}</strong></div>
      {im.pausado && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(200,90,70,.12)', border: '1px solid rgba(200,90,70,.3)', color: '#e0a89c', fontSize: 13 }}>
          Este imóvel está pausado no momento. Confirme a disponibilidade antes de oferecer.
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
        {im.fotos.length > 0 && (
          <a href={`/api/parceiro/${token}/fotos`} style={btn}>
            <Icone d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            Baixar fotos ({im.fotos.length}) · .zip
          </a>
        )}
        {im.temVideo && (
          <a href={`/api/parceiro/${token}/video`} style={btn}>
            <Icone d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            Baixar vídeo
          </a>
        )}
        {!im.temVideo && im.youtube && (
          <a href={im.youtube} target="_blank" rel="noopener" style={btn}>Ver vídeo no YouTube</a>
        )}
        {im.texto && (
          <button onClick={copiar} style={{ ...btn, background: copiado ? 'rgba(168,192,143,.18)' : 'var(--cream)', color: copiado ? 'var(--green)' : '#2A2117', border: '1px solid transparent' }}>
            {copiado ? '✓ Copiado' : 'Copiar descrição'}
          </button>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
        No celular, os arquivos vão para a pasta de downloads. Depois é só anexar no WhatsApp.
      </div>

      {im.texto && (
        <section style={{ marginTop: 26 }}>
          <h2 style={{ fontSize: 17, margin: '0 0 10px', color: 'var(--cream-2)' }}>Descrição pronta para o WhatsApp</h2>
          <textarea id="texto-parceiro" readOnly value={im.texto} rows={Math.min(22, im.texto.split('\n').length + 1)}
            style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--cream)', fontSize: 14, lineHeight: 1.5, resize: 'vertical' }} />
        </section>
      )}

      {im.fotos.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <h2 style={{ fontSize: 17, margin: '0 0 10px', color: 'var(--cream-2)' }}>Fotos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {im.fotos.map((f, i) => (
              <button key={i} onClick={() => setAberta(i)} style={{ padding: 0, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-2)', aspectRatio: '4/3' }}>
                <img src={f.thumb} alt={`Foto ${i + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>Toque numa foto para abrir em tamanho grande e salvar uma por uma, se preferir.</div>
        </section>
      )}

      {aberta !== null && (
        <div onClick={() => setAberta(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, zIndex: 50 }}>
          <img src={im.fotos[aberta].url} alt="" style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 10 }} />
          <a href={im.fotos[aberta].url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', padding: '10px 16px', borderRadius: 999, background: 'var(--cream)', color: '#2A2117', fontSize: 13, fontWeight: 700 }}>
            Abrir foto {aberta + 1} de {im.fotos.length}
          </a>
        </div>
      )}
    </main>
  );
}

function Icone({ d }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
