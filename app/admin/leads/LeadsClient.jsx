'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase-browser';
import { formatPreco } from '../../../lib/format';
import { SITE_URL, LEAD_TOKEN } from '../../../lib/config';

const CANAL = {
  CLICK_WHATSAPP: 'WhatsApp',
  CLICK_SCHEDULE: 'Agendamento',
  CONTACT_CHAT: 'Chat',
  CONTACT_FORM: 'Formulário',
  PHONE_VIEW: 'Viu o telefone',
  VISIT_REQUEST: 'Pediu visita',
};

const TEMP_COR = { Alta: '#A8C08F', 'Média': '#E8A87C', Baixa: '#8a7c68' };

export default function LeadsClient({ initialLeads }) {
  const supabase = createClient();
  const [leads, setLeads] = useState(initialLeads);
  const [aba, setAba] = useState('novos');
  const [copiado, setCopiado] = useState(false);

  const webhookUrl = `${SITE_URL}/api/leads/zap?k=${LEAD_TOKEN}`;

  async function marcarLido(l) {
    await supabase.from('leads').update({ lido: !l.lido }).eq('id', l.id);
    setLeads(list => list.map(x => x.id === l.id ? { ...x, lido: !l.lido } : x));
  }

  const novos = leads.filter(l => !l.lido);
  const lista = aba === 'novos' ? novos : leads;

  function quando(iso) {
    const d = new Date(iso);
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min} min`;
    if (min < 1440) return `há ${Math.round(min / 60)} h`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-3)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 820, minHeight: '100vh', background: 'var(--bg)' }}>

        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(31,24,18,.95)', backdropFilter: 'blur(8px)', padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin" title="Voltar à gestão" style={{ display: 'flex', width: 38, height: 38, flex: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)', fontSize: 17 }}>←</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 18, color: 'var(--cream-2)' }}>Leads</div>
            <div style={{ fontSize: 12, color: 'var(--taupe)' }}>{novos.length ? `${novos.length} novo(s)` : 'tudo em dia'}</div>
          </div>
          <Link href="/admin/portais" title="Portais" style={{ display: 'flex', width: 38, height: 38, flex: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)' }}>⌂</Link>
        </header>

        <div style={{ padding: '18px 20px 60px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* WEBHOOK */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(232,168,124,.25)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <strong style={{ fontSize: 13.5, color: 'var(--cream-2)' }}>Endereço que recebe os leads</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input readOnly value={webhookUrl} onFocus={e => e.target.select()} style={{ flex: 1, minWidth: 200, background: 'var(--bg)', border: '1px solid rgba(232,168,124,.3)', borderRadius: 10, padding: '13px 15px', fontSize: 13, color: 'var(--accent)' }} />
              <button onClick={() => { navigator.clipboard?.writeText(webhookUrl); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }}
                style={{ padding: '13px 18px', borderRadius: 10, background: 'var(--accent)', color: '#2A2117', fontSize: 13, fontWeight: 700, border: 0 }}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              Cole em <strong style={{ color: 'var(--sand)' }}>Canal Pro → Configurações → Integrações → Leads → Receber leads no CRM</strong>. Como nome do CRM, use “Jason Dias Imóveis”. Antes disso, valide o endereço no validador do Grupo OLX e envie o formulário de homologação.
            </div>
          </div>

          {/* ABAS */}
          <div style={{ display: 'flex', gap: 7 }}>
            {[['novos', `Novos (${novos.length})`], ['todos', `Todos (${leads.length})`]].map(([k, label]) => (
              <button key={k} onClick={() => setAba(k)} style={{ padding: '9px 15px', borderRadius: 999, fontSize: 12.5, fontWeight: aba === k ? 700 : 400, background: aba === k ? 'var(--cream)' : 'transparent', color: aba === k ? '#2A2117' : 'var(--cream)', border: `1px solid ${aba === k ? 'var(--cream)' : 'rgba(243,237,227,.25)'}` }}>{label}</button>
            ))}
          </div>

          {/* LISTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.map(l => {
              const im = l.imoveis;
              const tel = (l.telefone || '').replace(/\D/g, '');
              const link = im?.slug ? `${SITE_URL}/imovel/${im.slug}` : '';
              const msg = encodeURIComponent(
                `Olá ${(l.nome || '').split(' ')[0]}! Aqui é da Jason Dias Imóveis. Vi seu interesse${l.codigo_imovel ? ` no imóvel ${l.codigo_imovel}` : ''}${im ? ` — ${im.titulo}` : ''}.${link ? ` Segue o tour em vídeo: ${link}` : ''} Posso te ajudar?`
              );
              return (
                <div key={l.id} style={{ background: 'var(--bg-2)', border: `1px solid ${l.lido ? 'var(--line)' : 'rgba(232,168,124,.35)'}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, opacity: l.lido ? 0.65 : 1 }}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream-2)' }}>{l.nome || 'Sem nome'}</span>
                        {l.temperatura && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', padding: '3px 8px', borderRadius: 5, background: 'rgba(243,237,227,.07)', color: TEMP_COR[l.temperatura] || 'var(--taupe)' }}>{l.temperatura.toUpperCase()}</span>}
                        {l.canal && <span style={{ fontSize: 11, color: 'var(--taupe)' }}>{CANAL[l.canal] || l.canal}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--sand)', marginTop: 3 }}>
                        {l.telefone || '—'}{l.email ? ` · ${l.email}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: 'none' }}>{quando(l.created_at)}</span>
                  </div>

                  {/* imóvel de interesse */}
                  {(im || l.codigo_imovel) && (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', color: 'var(--taupe)' }}>IMÓVEL DE INTERESSE</div>
                      <div style={{ fontSize: 13.5, color: 'var(--cream-2)', marginTop: 3 }}>
                        {l.codigo_imovel && <span style={{ color: 'var(--accent)' }}>{l.codigo_imovel} · </span>}
                        {im ? im.titulo : 'não encontrado no sistema'}
                      </div>
                      {im && (
                        <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>
                          {im.bairro} · {formatPreco(im.preco_cents)}{im.finalidade === 'aluguel' ? '/mês' : ''}
                        </div>
                      )}
                      {link && <a href={link} target="_blank" rel="noopener" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'inline-block', marginTop: 6 }}>abrir o anúncio →</a>}
                    </div>
                  )}

                  {l.mensagem && <div style={{ fontSize: 12.5, color: 'var(--sand)', lineHeight: 1.55 }}>{l.mensagem.split('Sua opinião é muito importante')[0].trim()}</div>}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {tel && (
                      <a href={`https://wa.me/55${tel.replace(/^55/, '')}?text=${msg}`} target="_blank" rel="noopener"
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 9, background: 'var(--green)', color: '#1F1812', fontSize: 12.5, fontWeight: 700 }}>
                        Chamar no WhatsApp
                      </a>
                    )}
                    <button onClick={() => marcarLido(l)} style={{ padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(243,237,227,.22)', background: 'transparent', color: 'var(--sand)', fontSize: 12.5 }}>
                      {l.lido ? 'Marcar como novo' : 'Marcar como atendido'}
                    </button>
                  </div>
                </div>
              );
            })}
            {lista.length === 0 && (
              <div style={{ textAlign: 'center', padding: 44, color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                Nenhum lead ainda.<br />Depois de homologar o endereço acima no Canal Pro, os contatos do Zap, VivaReal e OLX caem aqui automaticamente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
