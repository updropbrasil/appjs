// API de Conversões da Meta (CAPI): manda o evento "Contact" do formulário também pelo servidor.
// O navegador continua disparando o Pixel; o mesmo event_id nos dois faz a Meta contar uma vez só.
// Por que: bloqueador de anúncio, iOS e Safari derrubam boa parte dos eventos do navegador;
// pelo servidor o evento sempre chega, e com telefone/nome (em hash) a Meta casa melhor com quem clicou no anúncio.
//
// Precisa de META_CAPI_TOKEN no ambiente (token gerado no Gestor de Eventos → Definições → API de Conversões).
// Opcional: META_CAPI_TEST_CODE (código da aba "Testar eventos") para ver o evento chegando ao vivo.
import { createHash } from 'crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const limpa = (s) => String(s || '').trim().toLowerCase();

// telefone em E.164 sem "+" (55 + DDD + número), como a Meta pede
function telefoneHash(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (!String(tel).trim().startsWith('+') && !d.startsWith('55')) d = '55' + d;
  return sha(d);
}

function nomeHash(nome) {
  const partes = limpa(nome).split(/\s+/).filter(Boolean);
  if (!partes.length) return {};
  return { fn: [sha(partes[0])], ...(partes.length > 1 ? { ln: [sha(partes[partes.length - 1])] } : {}) };
}

// cookie _fbc/_fbp do navegador; sem _fbc, monta a partir do fbclid que veio na URL
function fbcDe(cookies, fbclid) {
  const m = /(?:^|;\s*)_fbc=([^;]+)/.exec(cookies || '');
  if (m) return decodeURIComponent(m[1]);
  if (fbclid && /^[\w-]{10,200}$/.test(fbclid)) return `fb.1.${Date.now()}.${fbclid}`;
  return null;
}
function fbpDe(cookies) {
  const m = /(?:^|;\s*)_fbp=([^;]+)/.exec(cookies || '');
  return m ? decodeURIComponent(m[1]) : null;
}

export function capiConfigurada() {
  return !!process.env.META_CAPI_TOKEN;
}

// Envia um evento. Nunca lança: devolve { ok, erro } para registrar no log e seguir.
export async function enviarEventoCapi({ pixelId, evento = 'Contact', eventId, nome, telefone, ip, userAgent, cookies, fbclid, url, custom }) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return { ok: false, erro: 'META_CAPI_TOKEN ausente' };
  if (!/^\d{6,20}$/.test(String(pixelId || ''))) return { ok: false, erro: 'pixel sem id' };

  const user_data = {
    ...(telefone ? { ph: [telefoneHash(telefone)].filter(Boolean) } : {}),
    ...nomeHash(nome),
    ...(ip && ip !== 'sem-ip' ? { client_ip_address: ip } : {}),
    ...(userAgent ? { client_user_agent: String(userAgent).slice(0, 500) } : {}),
  };
  const fbp = fbpDe(cookies); if (fbp) user_data.fbp = fbp;
  const fbc = fbcDe(cookies, fbclid); if (fbc) user_data.fbc = fbc;

  const data = [{
    event_name: evento,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId || undefined,
    action_source: 'website',
    event_source_url: url || undefined,
    user_data,
    ...(custom ? { custom_data: custom } : {}),
  }];
  const body = { data, ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}) };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(`${GRAPH}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) return { ok: false, erro: j.error?.message || `HTTP ${r.status}` };
    return { ok: true, recebidos: j.events_received };
  } catch (e) {
    return { ok: false, erro: e.name === 'AbortError' ? 'tempo esgotado' : (e.message || 'falha') };
  } finally {
    clearTimeout(t);
  }
}
