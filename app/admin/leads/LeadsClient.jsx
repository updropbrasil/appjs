'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase-browser';
import { SITE_URL, LEAD_TOKEN, LEAD_SECRET_KEY } from '../../../lib/config';

const CANAL = {
  CLICK_WHATSAPP: 'WhatsApp',
  CLICK_SCHEDULE: 'Agendamento',
  CONTACT_CHAT: 'Chat',
  CONTACT_FORM: 'Formulário',
  PHONE_VIEW: 'Viu o telefone',
  VISIT_REQUEST: 'Pediu visita',
};

export default function LeadsClient({ initialLeads, initialWebhook, codigoExemplo, slugExemplo }) {
  const supabase = createClient();
  const [leads, setLeads] = useState(initialLeads);
  const [aba, setAba] = useState('todos');
  const [hook, setHook] = useState(initialWebhook || '');
  const [hookSalvo, setHookSalvo] = useState(true);
  const [testando, setTestando] = useState('');
  const [reenviando, setReenviando] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [verConfig, setVerConfig] = useState(!initialWebhook);
  const [simulando, setSimulando] = useState('');

  // Dispara no nosso próprio endereço um lead no formato exato que o Grupo OLX
  // manda. Prova a corrente inteira: portal → site → n8n.
  async function simularLead() {
    setSimulando('enviando');
    try {
      const r = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // mesma assinatura que o Grupo OLX envia — senão o teste leva 401 com a chave ativa
          ...(LEAD_SECRET_KEY ? { Authorization: 'Basic ' + btoa('vivareal:' + LEAD_SECRET_KEY) } : {}),
        },
        body: JSON.stringify({
          originLeadId: `teste-${Date.now()}`,
          leadOrigin: 'Grupo OLX',
          timestamp: new Date().toISOString(),
          clientListingId: codigoExemplo,
          name: 'Lead de Teste',
          email: 'teste@exemplo.com',
          ddd: '83',
          phone: '999282626',
          message: 'Olá, gostaria de mais informações sobre este imóvel.',
          temperature: 'Alta',
          transactionType: 'RENT',
          extraData: { leadType: 'CLICK_WHATSAPP' },
        }),
      });
      setSimulando(r.ok ? 'ok' : 'erro');
      if (r.ok) setTimeout(() => window.location.reload(), 1200);
    } catch { setSimulando('erro'); }
    setTimeout(() => setSimulando(''), 5000);
  }

  const webhookUrl = `${SITE_URL}/api/leads/zap?k=${LEAD_TOKEN}`;
  const falhas = leads.filter(l => l.webhook_status === 'falhou' || l.webhook_status === 'sem_webhook');
  const lista = aba === 'falhas' ? falhas : leads;

  async function salvarHook() {
    await supabase.from('site_config').upsert({ key: 'lead_webhook_url', value: (hook || '').trim() });
    setHookSalvo(true);
  }

  async function testarHook() {
    if (!hook.trim()) return;
    setTestando('enviando');
    const linkExemplo = slugExemplo ? `${SITE_URL}/imovel/${slugExemplo}` : `${SITE_URL}/`;
    const imovelTeste = {
      codigo: codigoExemplo,
      titulo: 'Apartamento vista-mar no Cabo Branco',
      link: linkExemplo,
      finalidade: 'aluguel',
      categoria: 'Apartamento',
      bairro: 'Cabo Branco',
      endereco: 'Av. Cabo Branco', numero: '1200', complemento: 'apto 902', cep: '58045-010',
      referencia: 'Em frente à orla',
      preco: 6500, preco_formatado: 'R$ 6.500/mês',
      condominio: 890, iptu: 'Isento',
      quartos: 3, suites: 2, banheiros: 4, vagas: 2, area_m2: 148,
      andar: '9º', ano_construcao: 2019, mobilia: 'Semimobiliado',
      caracteristicas: ['Piscina', 'Academia', 'Varanda gourmet', 'Portaria 24h'],
      descricao: 'Vista permanente para o mar, varanda gourmet integrada e prédio com lazer completo.',
      video_youtube: 'https://www.youtube.com/shorts/EXEMPLO', video_arquivo: null,
      capa: null, fotos_qtd: 8,
      parceiro: null, parceiro_pct: null,
      resumo: '3 quartos · 2 suítes · 4 banheiros · 148 m² · 2 vagas · andar 9º · Semimobiliado',
      contexto_ia: [
        `IMÓVEL ${codigoExemplo} — Apartamento vista-mar no Cabo Branco`,
        'Finalidade: para alugar',
        'Tipo: Apartamento',
        'Bairro: Cabo Branco, João Pessoa/PB',
        'Valor: R$ 6.500/mês',
        'Condomínio: R$ 890,00',
        'IPTU: isento',
        'Área: 148 m²',
        'Quartos: 3 (sendo 2 suítes)',
        'Banheiros: 4',
        'Vagas de garagem: 2',
        'Andar: 9º',
        'Ano de construção: 2019',
        'Mobília: Semimobiliado',
        'Características e lazer: Piscina, Academia, Varanda gourmet, Portaria 24h',
        'Descrição do anúncio: Vista permanente para o mar, varanda gourmet integrada e prédio com lazer completo.',
        `Link do anúncio (com tour em vídeo): ${linkExemplo}`,
        'Localização exata (rua e número): não revelar ao cliente antes da visita agendada.',
        'Se o cliente perguntar algo que não está nesta lista, diga que vai confirmar com o corretor — nunca inventar.',
      ].join('\n'),
    };
    try {
      const r = await fetch(hook.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento: 'lead_novo', teste: true,
          origem: 'Grupo OLX', canal: 'CLICK_WHATSAPP', temperatura: 'Alta', transacao: 'RENT',
          lead_certo: false,
          nome: 'Cliente Teste', telefone: '83999282626', whatsapp: '5583999282626',
          whatsapp_link: `https://wa.me/5583999282626?text=${encodeURIComponent('Olá Cliente! Aqui é da Jason Dias Imóveis. Vi seu interesse no imóvel ' + codigoExemplo + '. Posso te ajudar?')}`,
          mensagem_sugerida: `Olá Cliente! Aqui é da Jason Dias Imóveis. Vi seu interesse no imóvel ${codigoExemplo} — Apartamento vista-mar no Cabo Branco. Posso te ajudar?`,
          email: 'teste@exemplo.com', mensagem_lead: 'Olá, gostaria de mais informações sobre este imóvel.',
          codigo_imovel: codigoExemplo,
          imovel: imovelTeste,
          mcmv: null,
          recebido_em: new Date().toISOString(),
        }),
      });
      setTestando(r.ok ? 'ok' : 'erro');
    } catch { setTestando('erro'); }
    setTimeout(() => setTestando(''), 4000);
  }

  async function reenviar(l) {
    setReenviando(l.id);
    try {
      const r = await fetch('/api/leads/reenviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: l.id }),
      });
      const j = await r.json();
      setLeads(list => list.map(x => x.id === l.id
        ? { ...x, webhook_status: j.status || 'falhou', webhook_erro: j.erro || null, webhook_tentativas: (x.webhook_tentativas || 0) + 1 }
        : x));
    } catch {
      setLeads(list => list.map(x => x.id === l.id ? { ...x, webhook_erro: 'falha ao reenviar' } : x));
    }
    setReenviando(null);
  }

  function quando(iso) {
    const d = new Date(iso);
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min} min`;
    if (min < 1440) return `${Math.round(min / 60)} h`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-3)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 780, minHeight: '100vh', background: 'var(--bg)' }}>

        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(31,24,18,.95)', backdropFilter: 'blur(8px)', padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin" title="Voltar" style={{ display: 'flex', width: 36, height: 36, flex: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', color: 'var(--sand)', fontSize: 17 }}>←</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 17, color: 'var(--cream-2)' }}>Leads recebidos</div>
            <div style={{ fontSize: 11.5, color: falhas.length ? '#c88a7a' : 'var(--taupe)' }}>
              {leads.length} no total{falhas.length ? ` · ${falhas.length} não chegaram ao n8n` : ' · todos enviados ao n8n'}
            </div>
          </div>
          <button onClick={() => setVerConfig(v => !v)} title="Configuração"
            style={{ width: 36, height: 36, flex: 'none', borderRadius: 999, border: '1px solid rgba(243,237,227,.15)', background: 'transparent', color: 'var(--sand)', fontSize: 15 }}>⚙</button>
        </header>

        <div style={{ padding: '14px 18px 60px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {verConfig && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'var(--taupe)', marginBottom: 7 }}>PARA ONDE MANDAMOS O LEAD (n8n)</div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <input value={hook} onChange={e => { setHook(e.target.value); setHookSalvo(false); }} placeholder="https://n8n.seudominio.com/webhook/lead-jason"
                    style={{ flex: 1, minWidth: 190, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.15)', borderRadius: 9, padding: '11px 13px', fontSize: 14, color: 'var(--cream)' }} />
                  <button onClick={salvarHook} style={{ padding: '11px 15px', borderRadius: 9, background: 'var(--accent)', color: '#2A2117', fontSize: 12.5, fontWeight: 700, border: 0 }}>{hookSalvo ? 'Salvo ✓' : 'Salvar'}</button>
                  <button onClick={testarHook} disabled={!hook.trim()}
                    style={{ padding: '11px 14px', borderRadius: 9, border: '1px solid rgba(243,237,227,.22)', background: 'transparent', fontSize: 12.5, opacity: hook.trim() ? 1 : 0.4, color: testando === 'ok' ? 'var(--green)' : testando === 'erro' ? '#c88a7a' : 'var(--sand)' }}>
                    {testando === 'enviando' ? '…' : testando === 'ok' ? 'Enviado ✓' : testando === 'erro' ? 'Falhou' : 'Testar'}
                  </button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: 'var(--taupe)', marginBottom: 7 }}>ENDEREÇO QUE O PORTAL CHAMA</div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  <input readOnly value={webhookUrl} onFocus={e => e.target.select()}
                    style={{ flex: 1, minWidth: 190, background: 'var(--bg)', border: '1px solid rgba(243,237,227,.12)', borderRadius: 9, padding: '11px 13px', fontSize: 12.5, color: 'var(--taupe)' }} />
                  <button onClick={() => { navigator.clipboard?.writeText(webhookUrl); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }}
                    style={{ padding: '11px 15px', borderRadius: 9, border: '1px solid rgba(243,237,227,.22)', background: 'transparent', color: copiado ? 'var(--green)' : 'var(--sand)', fontSize: 12.5 }}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, flexWrap: 'wrap' }}>
                  <button onClick={simularLead}
                    style={{ padding: '10px 15px', borderRadius: 9, border: `1px solid ${simulando === 'ok' ? 'var(--green)' : simulando === 'erro' ? '#c88a7a' : 'rgba(232,168,124,.45)'}`, background: 'transparent', fontSize: 12.5, fontWeight: 700, color: simulando === 'ok' ? 'var(--green)' : simulando === 'erro' ? '#c88a7a' : 'var(--accent)' }}>
                    {simulando === 'enviando' ? 'Enviando…' : simulando === 'ok' ? 'Funcionou ✓' : simulando === 'erro' ? 'Falhou' : 'Simular lead do portal'}
                  </button>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', flex: 1, minWidth: 160, lineHeight: 1.5 }}>
                    Manda um lead falso no formato exato do Grupo OLX (imóvel {codigoExemplo}) e mostra na lista abaixo.
                  </span>
                </div>
              </div>
            </div>
          )}

          {falhas.length > 0 && (
            <div style={{ display: 'flex', gap: 7 }}>
              {[['todos', `Todos (${leads.length})`], ['falhas', `Com falha (${falhas.length})`]].map(([k, label]) => (
                <button key={k} onClick={() => setAba(k)} style={{ padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: aba === k ? 700 : 400, background: aba === k ? 'var(--cream)' : 'transparent', color: aba === k ? '#2A2117' : 'var(--cream)', border: `1px solid ${aba === k ? 'var(--cream)' : 'rgba(243,237,227,.22)'}` }}>{label}</button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lista.map(l => {
              const falhou = l.webhook_status === 'falhou';
              const semHook = l.webhook_status === 'sem_webhook';
              const enviado = l.webhook_status === 'enviado';
              return (
                <div key={l.id} style={{ background: 'var(--bg-2)', border: `1px solid ${falhou || semHook ? 'rgba(200,138,122,.35)' : 'var(--line)'}`, borderRadius: 10, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span title={enviado ? 'enviado ao n8n' : falhou ? 'falhou' : semHook ? 'sem webhook configurado' : 'pendente'}
                      style={{ width: 22, height: 22, flex: 'none', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: enviado ? 'rgba(168,192,143,.18)' : 'rgba(200,138,122,.18)', color: enviado ? 'var(--green)' : '#c88a7a' }}>
                      {enviado ? '✓' : '!'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--cream-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.nome || 'Sem nome'}
                        {l.codigo_imovel && <span style={{ color: 'var(--accent)', fontWeight: 400 }}> · {l.codigo_imovel}</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--taupe)', marginTop: 1 }}>
                        {l.telefone || '—'}{l.canal ? ` · ${CANAL[l.canal] || l.canal}` : ''}{l.origem ? ` · ${l.origem.replace('Grupo OLX', 'Zap/OLX')}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: 'none' }}>{quando(l.created_at)}</span>
                  </div>

                  {(falhou || semHook) && (
                    <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ flex: 1, minWidth: 160, fontSize: 11.5, color: '#c88a7a', lineHeight: 1.5 }}>
                        {semHook ? 'Nenhum endereço de n8n configurado quando este lead chegou.' : l.webhook_erro || 'não conseguimos entregar ao n8n'}
                        {l.webhook_tentativas > 1 && <span style={{ color: 'var(--muted)' }}> · {l.webhook_tentativas} tentativas</span>}
                      </span>
                      <button onClick={() => reenviar(l)} disabled={reenviando === l.id}
                        style={{ padding: '8px 14px', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#2A2117', fontSize: 12, fontWeight: 700, opacity: reenviando === l.id ? 0.6 : 1 }}>
                        {reenviando === l.id ? 'Reenviando…' : 'Reenviar ao n8n'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {lista.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7 }}>
                {aba === 'falhas' ? 'Nenhuma falha — tudo chegou ao n8n.' : 'Nenhum lead ainda. Quando o portal enviar, aparece aqui e segue direto pro n8n.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
