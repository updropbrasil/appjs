// Recebe os leads do Grupo OLX (Zap Imóveis, VivaReal, OLX).
// Endereço: https://SEU-DOMINIO/api/leads/zap
// Documentação: developers.grupozap.com/webhooks/integration_leads.html
//
// Regras que o portal exige e que este endpoint cumpre:
//  · responde 2xx quando recebe o lead (qualquer outro código gera reenvio)
//  · é idempotente — o mesmo lead pode chegar mais de uma vez (originLeadId)
//  · devolve 4xx quando falta clientListingId num lead de anúncio,
//    para o portal reprocessar; leads MCMV são exceção
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, LEAD_TOKEN } from '../../../../lib/config';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  // só aceita quem tem a senha no fim da URL
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

  // encontra o imóvel pelo nosso código (JDA-4821)
  let imovelId = null;
  if (codigo) {
    const { data } = await supabase.from('imoveis').select('id').eq('codigo', codigo).maybeSingle();
    imovelId = data?.id || null;
  }

  const telefone = body.ddd && body.phone ? `${body.ddd}${body.phone}` : (body.phoneNumber || '');

  // onConflict em origin_lead_id: se o portal reenviar, atualiza em vez de duplicar
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
    imovel_id: imovelId,
    payload: body,
  }, { onConflict: 'origin_lead_id' });

  // 2xx = recebido. Nunca devolvemos erro por falha nossa de aviso,
  // senão o portal reenvia o mesmo lead 3 vezes.
  return new Response('ok', { status: 200 });
}

// o validador de endpoint do Grupo OLX confere se a URL responde
export async function GET() {
  return new Response('ok', { status: 200 });
}
