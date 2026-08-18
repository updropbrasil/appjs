// Recebe os leads do Grupo OLX (Zap Imóveis, VivaReal, OLX) e repassa ao n8n.
// Endereço: https://SEU-DOMINIO/api/leads/zap?k=SENHA
// Documentação: developers.grupozap.com/webhooks/integration_leads.html
//
// O site não atende lead: ele registra, chama o n8n e guarda se deu certo.
// Toda a distribuição (CRM, rodízio, WhatsApp) fica no n8n.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, LEAD_TOKEN, SITE_URL } from '../../../../lib/config';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  if (LEAD_TOKEN && searchParams.get('k') !== LEAD_TOKEN) {
    return new Response('não autorizado', { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('payload inválido', { status: 400 });
  }

  const mcmv = body.leadOrigin === 'MCMV_OLX';
  const codigo = body.clientListingId || null;

  // lead de anúncio sem código: 4xx faz o portal reprocessar depois
  if (!mcmv && !codigo) {
    return new Response('clientListingId ausente', { status: 422 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let imovel = null;
  if (codigo) {
    const { data } = await supabase.from('imoveis')
      .select('id, titulo, slug, bairro, preco_cents, finalidade, categoria')
      .eq('codigo', codigo).maybeSingle();
    imovel = data || null;
  }

  const telefone = body.ddd && body.phone ? `${body.ddd}${body.phone}` : (body.phoneNumber || '');

  // chama o n8n antes de gravar, para já registrar o resultado junto
  const envio = await chamarN8n(supabase, { body, codigo, imovel, telefone });

  await supabase.from('leads').upsert({
    origin_lead_id: body.originLeadId,
    origem: body.leadOrigin || 'Grupo OLX',
    canal: body.extraData?.leadType || null,
    temperatura: body.temperature || null,
    transacao: body.transactionType || null,
    nome: body.name || null,
    email: body.email || null,
    telefone: telefone || null,
    mensagem: body.message || null,
    codigo_imovel: codigo,
    imovel_id: imovel?.id || null,
    payload: body,
    webhook_status: envio.status,
    webhook_erro: envio.erro,
    webhook_enviado_em: envio.status === 'enviado' ? new Date().toISOString() : null,
    webhook_tentativas: 1,
  }, { onConflict: 'origin_lead_id' });

  // sempre 2xx: erro nosso não deve fazer o portal reenviar o lead 3 vezes
  return new Response('ok', { status: 200 });
}

export function montarPayload({ body, codigo, imovel, telefone }) {
  const tel = String(telefone || '').replace(/\D/g, '');
  const nome = body.name || '';
  const link = imovel?.slug ? `${SITE_URL}/imovel/${imovel.slug}` : '';
  const msg = `Olá ${nome.split(' ')[0]}! Aqui é da Jason Dias Imóveis. Vi seu interesse${codigo ? ` no imóvel ${codigo}` : ''}${imovel ? ` — ${imovel.titulo}` : ''}.${link ? ` Segue o tour em vídeo: ${link}` : ''} Posso te ajudar?`;

  return {
    evento: 'lead_novo',
    origem: body.leadOrigin || 'Grupo OLX',
    canal: body.extraData?.leadType || null,
    temperatura: body.temperature || null,
    transacao: body.transactionType || null,
    nome,
    telefone: tel,
    whatsapp: tel ? `55${tel.replace(/^55/, '')}` : '',
    whatsapp_link: tel ? `https://wa.me/55${tel.replace(/^55/, '')}?text=${encodeURIComponent(msg)}` : '',
    mensagem_sugerida: msg,
    email: body.email || null,
    mensagem_lead: body.message || null,
    codigo_imovel: codigo,
    imovel: imovel ? {
      titulo: imovel.titulo, bairro: imovel.bairro, categoria: imovel.categoria,
      finalidade: imovel.finalidade,
      preco: imovel.preco_cents ? imovel.preco_cents / 100 : null,
      link,
    } : null,
    recebido_em: new Date().toISOString(),
  };
}

// Devolve {status, erro} — nunca lança.
export async function chamarN8n(supabase, dados) {
  try {
    const { data } = await supabase.from('site_config').select('value').eq('key', 'lead_webhook_url').maybeSingle();
    const url = (data?.value || '').trim();
    if (!url) return { status: 'sem_webhook', erro: null };

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(montarPayload(dados)),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      const txt = (await res.text().catch(() => '')).slice(0, 300);
      return { status: 'falhou', erro: `HTTP ${res.status}${txt ? ` — ${txt}` : ''}` };
    }
    return { status: 'enviado', erro: null };
  } catch (e) {
    const msg = e?.name === 'AbortError'
      ? 'o n8n não respondeu em 10 segundos'
      : (e?.message || 'falha de conexão com o n8n');
    return { status: 'falhou', erro: msg };
  }
}

// o validador de endpoint do Grupo OLX confere se a URL responde
export async function GET() {
  return new Response('ok', { status: 200 });
}
