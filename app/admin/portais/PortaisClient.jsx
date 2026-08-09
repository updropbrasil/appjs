'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase-browser';
import { formatPreco } from '../../../lib/format';
import { motivoInapto, qualidadeAnuncio } from '../../../lib/zap-feed';
import { SITE_URL } from '../../../lib/config';

export default function PortaisClient({ initialImoveis, initialEmail }) {
  const supabase = createClient();
  const [imoveis, setImoveis] = useState(initialImoveis);
  const [aba, setAba] = useState('no-portal');
  const [copiado, setCopiado] = useState(false);
  const [email, setEmail] = useState(initialEmail || '');
  const [emailSalvo, setEmailSalvo] = useState(true);
  const [aberto, setAberto] = useState(null);
  const [sel, setSel] = useState([]);
  const [aplicando, setAplicando] = useState(false);

  const feedUrl = `${SITE_URL}/feed/zap.xml`;

  async function salvarEmail() {
    await supabase.from('site_config').upsert({ key: 'zap_email', value: (email || '').trim() });
    setEmailSalvo(true);
  }
  async function toggleZap(im) {
    const novo = im.zap_ativo === false;
    await supabase.from('imoveis').update({ zap_ativo: novo }).eq('id', im.id);
    setImoveis(l => l.map(x => x.id === im.id ? { ...x, zap_ativo: novo } : x));
  }
  async function aplicarEmMassa(ligar) {
    if (!sel.length) return;
    setAplicando(true);
    await supabase.from('imoveis').update({ zap_ativo: ligar }).in('id', sel);
    setImoveis(l => l.map(x => sel.includes(x.id) ? { ...x, zap_ativo: ligar } : x));
    setSel([]);
    setAplicando(false);
  }

  const grupos = { no: [], fora: [], pendente: [] };
  imoveis.filter(i => i.status === 'ativo').forEach(im => {
    if (im.zap_ativo === false) { grupos.fora.push({ im, motivo: null }); return; }
    const motivo = motivoInapto(im);
    if (motivo) grupos.pendente.push({ im, motivo });
    else grupos.no.push({ im, motivo: null });
  });

  const lista = aba === 'no-portal' ? grupos.no : aba === 'fora' ? grupos.fora : grupos.pendente;
  const mediaScore = grupos.no.length
    ? Math.round(grupos.no.reduce((s, { im }) => s + qualidadeAnuncio(im).score, 0) / grupos.no.length)
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-3)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 820, minHeight: '100vh', background: 'var(--bg)' }}>

        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(31,24,18,.95)', backdropFilter: 'blur(8px)', padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin" title="Voltar à gestão" style={{ display: 'flex', width: 38, height: 38, flex: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)', fontSize: 17 }}>←</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 18, color: 'var(--cream-2)' }}>Portais</div>
            <div style={{ fontSize: 12, color: 'var(--taupe)' }}>Zap Imóveis · VivaReal · OLX</div>
          </div>
          <Link href="/" title="Ver o site" style={{ display: 'flex', width: 38, height: 38, flex: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)' }}>⌂</Link>
        </header>

        <div style={{ padding: '18px 20px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* RESUMO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
            <Kpi valor={grupos.no.length} label="no portal" cor="var(--green)" />
            <Kpi valor={grupos.pendente.length} label="falta ajustar" cor="#c8a87a" />
            <Kpi valor={grupos.fora.length} label="desligados" cor="var(--taupe)" />
            <Kpi valor={`${mediaScore}%`} label="qualidade média" cor="var(--accent)" />
          </div>

          {/* FEED */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(232,168,124,.25)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <strong style={{ fontSize: 13.5, color: 'var(--cream-2)' }}>Endereço do feed</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input readOnly value={feedUrl} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 200, background: 'var(--bg)', border: '1px solid rgba(232,168,124,.3)', borderRadius: 10, padding: '13px 15px', fontSize: 14, color: 'var(--accent)' }} />
              <button onClick={() => { navigator.clipboard?.writeText(feedUrl); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }}
                style={{ padding: '13px 18px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13, fontWeight: 700, border: 0 }}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
              <a href={feedUrl} target="_blank" rel="noopener" style={{ padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(243,237,227,.18)', color: 'var(--sand)', fontSize: 13 }}>Abrir</a>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>O Grupo OLX lê este endereço sozinho, 2× por dia. Destaque e Super Destaque você define no Canal Pro — aqui a gente não mexe.</div>
          </div>

          {/* E-MAIL */}
          <div style={{ background: 'var(--bg-2)', border: `1px solid ${email ? 'var(--line)' : 'rgba(200,168,122,.5)'}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <strong style={{ fontSize: 13.5, color: 'var(--cream-2)' }}>E-mail que recebe os leads {!email && <span style={{ color: '#c8a87a', fontWeight: 400 }}>— falta preencher</span>}</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={email} onChange={e => { setEmail(e.target.value); setEmailSalvo(false); }} type="email" placeholder="contato@jasondias.com.br" style={{ flex: 1, minWidth: 200, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 10, padding: '13px 15px', fontSize: 15, color: 'var(--cream)' }} />
              <button onClick={salvarEmail} style={{ padding: '13px 18px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13, fontWeight: 700, border: 0 }}>{emailSalvo ? 'Salvo ✓' : 'Salvar'}</button>
            </div>
          </div>

          {/* ABAS */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[['no-portal', `No portal (${grupos.no.length})`], ['pendente', `Falta ajustar (${grupos.pendente.length})`], ['fora', `Desligados (${grupos.fora.length})`]].map(([k, label]) => (
              <button key={k} onClick={() => { setAba(k); setSel([]); }} style={{ padding: '9px 15px', borderRadius: 999, fontSize: 12.5, fontWeight: aba === k ? 700 : 400, background: aba === k ? 'var(--cream)' : 'transparent', color: aba === k ? '#2A2117' : 'var(--cream)', border: `1px solid ${aba === k ? 'var(--cream)' : 'rgba(243,237,227,.25)'}` }}>{label}</button>
            ))}
          </div>

          {/* SELEÇÃO EM MASSA */}
          {lista.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: sel.length ? 'rgba(232,168,124,.1)' : 'var(--bg-2)', border: `1px solid ${sel.length ? 'rgba(232,168,124,.35)' : 'var(--line)'}`, borderRadius: 12, padding: '10px 14px' }}>
              <button onClick={() => setSel(sel.length === lista.length ? [] : lista.map(({ im }) => im.id))}
                style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 0, color: 'var(--cream)', fontSize: 13, padding: 0 }}>
                <span style={{ width: 20, height: 20, flex: 'none', borderRadius: 6, border: `1.5px solid ${sel.length === lista.length ? 'var(--accent)' : 'rgba(243,237,227,.3)'}`, background: sel.length === lista.length ? 'var(--accent)' : 'transparent', color: '#2A2117', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{sel.length === lista.length ? '✓' : ''}</span>
                {sel.length === lista.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              {sel.length > 0 && (
                <>
                  <span style={{ fontSize: 12.5, color: 'var(--taupe)' }}>{sel.length} selecionado(s)</span>
                  <span style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <button onClick={() => aplicarEmMassa(true)} disabled={aplicando}
                      style={{ padding: '9px 15px', borderRadius: 9, border: 0, background: 'var(--green)', color: '#1F1812', fontSize: 12.5, fontWeight: 700, opacity: aplicando ? 0.6 : 1 }}>Ligar no portal</button>
                    <button onClick={() => aplicarEmMassa(false)} disabled={aplicando}
                      style={{ padding: '9px 15px', borderRadius: 9, border: '1px solid rgba(243,237,227,.25)', background: 'transparent', color: 'var(--sand)', fontSize: 12.5, fontWeight: 700, opacity: aplicando ? 0.6 : 1 }}>Desligar</button>
                  </span>
                </>
              )}
            </div>
          )}

          {/* LISTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.map(({ im, motivo }) => {
              const q = qualidadeAnuncio(im);
              const abertoAqui = aberto === im.id;
              return (
                <div key={im.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                    <button onClick={() => setSel(s => s.includes(im.id) ? s.filter(x => x !== im.id) : [...s, im.id])} aria-label="Selecionar"
                      style={{ width: 20, height: 20, flex: 'none', borderRadius: 6, border: `1.5px solid ${sel.includes(im.id) ? 'var(--accent)' : 'rgba(243,237,227,.3)'}`, background: sel.includes(im.id) ? 'var(--accent)' : 'transparent', color: '#2A2117', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>{sel.includes(im.id) ? '✓' : ''}</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--cream-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {im.codigo ? <span style={{ color: 'var(--taupe)', fontWeight: 400 }}>{im.codigo} · </span> : null}{im.titulo}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>
                        {im.bairro} · {formatPreco(im.preco_cents)}{im.finalidade === 'aluguel' ? '/mês' : ''}
                      </div>
                      {motivo && <div style={{ fontSize: 11.5, color: '#c8a87a', marginTop: 4 }}>Fora do portal: {motivo}</div>}
                    </div>
                    <button onClick={() => toggleZap(im)} title={im.zap_ativo === false ? 'Ligar' : 'Desligar'}
                      style={{ width: 46, height: 26, flex: 'none', borderRadius: 999, border: 0, padding: 3, background: im.zap_ativo === false ? 'rgba(243,237,227,.14)' : 'var(--green)', display: 'flex', justifyContent: im.zap_ativo === false ? 'flex-start' : 'flex-end' }}>
                      <span style={{ width: 20, height: 20, borderRadius: 999, background: '#F3EDE3', display: 'block' }}></span>
                    </button>
                  </div>

                  {/* barra de qualidade */}
                  <div style={{ padding: '0 14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(243,237,227,.1)', overflow: 'hidden' }}>
                        <div style={{ width: `${q.score}%`, height: '100%', background: q.score >= 80 ? 'var(--green)' : q.score >= 55 ? 'var(--accent)' : '#c88a7a' }}></div>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: q.score >= 80 ? 'var(--green)' : 'var(--accent)', flex: 'none' }}>{q.score}%</span>
                      <button onClick={() => setAberto(abertoAqui ? null : im.id)} style={{ background: 'transparent', border: 0, color: 'var(--taupe)', fontSize: 11.5, flex: 'none' }}>
                        {abertoAqui ? 'fechar' : `${q.faltando.length} melhoria(s)`}
                      </button>
                      <Link href={`/admin/novo?id=${im.id}`} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', flex: 'none' }}>corrigir →</Link>
                    </div>

                    {abertoAqui && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                        {q.itens.map(it => (
                          <div key={it.label} style={{ display: 'flex', gap: 8, fontSize: 12, color: it.ok ? 'var(--taupe)' : 'var(--sand)' }}>
                            <span style={{ flex: 'none', color: it.ok ? 'var(--green)' : '#c8a87a' }}>{it.ok ? '✓' : '○'}</span>
                            <span><strong style={{ fontWeight: it.ok ? 400 : 700 }}>{it.label}</strong>{!it.ok && <span style={{ color: 'var(--muted)' }}> — {it.dica}</span>}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {lista.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Nenhum imóvel nesta aba.</div>}
          </div>

          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--sand)', display: 'block', marginBottom: 4 }}>Como o portal enxerga o endereço</strong>
            Mandamos rua, número e CEP porque isso melhora seu posicionamento e coloca o imóvel na busca por mapa — mas o portal exibe <strong style={{ color: 'var(--sand)' }}>só o bairro</strong> para quem pesquisa. Nenhum concorrente vê a rua.
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ valor, label, cor }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '13px 15px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{label}</div>
    </div>
  );
}
