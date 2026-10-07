// Formulário "Falar no WhatsApp" do site: a pessoa deixa nome e WhatsApp.
// Segue o MESMO caminho dos leads de portal: grava em `leads` e chama o n8n
// (confere se o número tem WhatsApp, avisa o Vitor e o SDR manda a primeira mensagem).
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../../lib/config';
import { chamarN8n } from '../zap/route';

export const dynamic = 'force-dynamic';

// Limite simples por IP (evita robô enchendo o CRM): 5 envios a cada 10 minutos
const janela = new Map();
function limiteOk(ip) {
  const agora = Date.now();
  const lista = (janela.get(ip) || []).filter((t) => agora - t < 10 * 60 * 1000);
  if (lista.length >= 5) { janela.set(ip, lista); return false; }
  lista.push(agora);
  janela.set(ip, lista);
  if (janela.size > 5000) janela.clear();
  return true;
}

const limpa = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false, erro: 'Dados inválidos.' }, { status: 400 }); }

  // robô: preencheu o campo invisível ou enviou rápido demais → finge que deu certo e não grava
  if (b?.hp || (typeof b?.ms === 'number' && b.ms < 1500)) return Response.json({ ok: true });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'sem-ip';
  if (!limiteOk(ip)) return Response.json({ ok: false, erro: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 });

  const nome = limpa(b?.nome, 80);
  const bruto = limpa(b?.telefone, 24);
  const internacional = /^\+/.test(bruto) && !bruto.replace(/\D/g, '').startsWith('55');
  let dig = bruto.replace(/\D/g, '');
  if (nome.length < 2) return Response.json({ ok: false, erro: 'Digite seu nome.' }, { status: 400 });
  if (internacional ? (dig.length < 8 || dig.length > 15) : !(dig.length === 10 || dig.length === 11 || ((dig.length === 12 || dig.length === 13) && dig.startsWith('55')))) {
    return Response.json({ ok: false, erro: 'Confira o WhatsApp com DDD.' }, { status: 400 });
  }
  if (!internacional && dig.startsWith('55') && dig.length >= 12) dig = dig.slice(2); // guarda DDD + número; o n8n testa as variações
  const telefone = internacional ? `+${dig}` : dig;

  const codigo = /^JD[AV]-?\d{2,6}$/i.test(String(b?.codigo || '')) ? String(b.codigo).toUpperCase() : null;
  const utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) if (b?.utm?.[k]) utm[k] = limpa(b.utm[k], 80);
  const anuncio = [utm.utm_campaign, utm.utm_content].filter(Boolean).join(' / ');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let imovel = null;
  if (codigo) {
    const { data } = await supabase.from('imoveis').select('*, parceiros(nome), imovel_fotos(url, ordem)').eq('codigo', codigo).maybeSingle();
    imovel = data || null;
  }

  const body = {
    name: nome,
    message: `Pediu contato pelo formulário do site${anuncio ? ` (anúncio: ${anuncio})` : ''}${b?.pagina ? ` · página ${limpa(b.pagina, 120)}` : ''}`,
    leadOrigin: 'Site',
    extraData: { leadType: 'FORM_WHATSAPP_SITE', utm },
  };

  const envio = await chamarN8n(supabase, { body, codigo, imovel, telefone });

  // mesmo formulário reenviado em 10 minutos não vira lead duplicado
  const bloco = Math.floor(Date.now() / (10 * 60 * 1000));
  const base = {
    origin_lead_id: `site_${dig}_${codigo || 'geral'}_${bloco}`,
    origem: 'Site',
    canal: 'FORM_WHATSAPP_SITE',
    nome,
    telefone,
    mensagem: body.message,
    codigo_imovel: codigo,
    imovel_id: imovel?.id || null,
    payload: body,
  };
  const { error } = await supabase.from('leads').upsert({
    ...base,
    webhook_status: envio.status,
    webhook_erro: envio.erro,
    webhook_enviado_em: envio.status === 'enviado' ? new Date().toISOString() : null,
    webhook_tentativas: 1,
  }, { onConflict: 'origin_lead_id' });
  if (error) {
    console.error('[lead site] falha ao gravar com webhook_*:', error.message);
    const r2 = await supabase.from('leads').upsert(base, { onConflict: 'origin_lead_id' });
    if (r2.error) console.error('[lead site] falha ao gravar o lead:', r2.error.message);
  }

  // Para a pessoa, deu certo se o n8n recebeu OU se o lead ficou gravado (dá para reenviar pelo painel)
  if (envio.status !== 'enviado' && error) {
    return Response.json({ ok: false, erro: 'Não consegui enviar agora. Tente de novo ou chame no WhatsApp.' }, { status: 502 });
  }
  return Response.json({ ok: true });
}
