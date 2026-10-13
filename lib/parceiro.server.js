// Link de material para corretor parceiro (só no servidor).
//
// O link /parceiro/<token> abre uma página sem logo com as fotos, o vídeo e a
// descrição do imóvel para o parceiro baixar. O token é o id do imóvel mais uma
// assinatura (HMAC), então não precisa de coluna no banco e ninguém consegue
// montar o link de outro imóvel sem o segredo do servidor.
//
// Segredo: PARCEIRO_SECRET no Coolify. Sem ele, usa um derivado da chave do R2
// (que também só existe no servidor). Trocar o segredo invalida todos os links.
import { createHmac, timingSafeEqual } from 'crypto';
import { createPublicClient } from './supabase-public';

function chave() {
  const base = process.env.PARCEIRO_SECRET || process.env.R2_SECRET_ACCESS_KEY || '';
  if (!base) return null;
  return createHmac('sha256', 'jd-link-parceiro-v1').update(base).digest();
}

function assina(idHex) {
  const k = chave();
  if (!k) return null;
  return createHmac('sha256', k).update(idHex).digest('base64url').slice(0, 20);
}

// uuid -> token "<32 hex><20 assinatura>"
export function gerarTokenParceiro(uuid) {
  const idHex = String(uuid || '').replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(idHex)) return null;
  const sig = assina(idHex);
  return sig ? idHex + sig : null;
}

// token -> uuid do imóvel, ou null se a assinatura não bater
export function lerTokenParceiro(token) {
  const t = String(token || '').trim();
  if (!/^[0-9a-f]{32}[A-Za-z0-9_-]{20}$/.test(t)) return null;
  const idHex = t.slice(0, 32);
  const sig = t.slice(32);
  const esperado = assina(idHex);
  if (!esperado) return null;
  const a = Buffer.from(sig), b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return `${idHex.slice(0, 8)}-${idHex.slice(8, 12)}-${idHex.slice(12, 16)}-${idHex.slice(16, 20)}-${idHex.slice(20)}`;
}

export const parceiroConfigurado = () => !!chave();

// Imóvel (com fotos) a partir do token, ou null se o token for inválido.
export async function imovelDoToken(token) {
  const id = lerTokenParceiro(token);
  if (!id) return null;
  const supabase = createPublicClient();
  const { data: im } = await supabase
    .from('imoveis')
    .select('id, codigo, titulo, status, finalidade, bairro, cidade, preco_cents, descricao, video_file_url, youtube_url')
    .eq('id', id)
    .maybeSingle();
  if (!im) return null;
  const { data: fotos } = await supabase.from('imovel_fotos').select('url, thumb_url, ordem').eq('imovel_id', im.id).order('ordem');
  return { ...im, fotos: (fotos || []).filter(f => f.url) };
}

// Texto da descrição pronto para o parceiro mandar no WhatsApp:
// tira a chamada "fale com a gente", links do site e telefones.
export function textoParaParceiro(descricao) {
  const linhas = String(descricao || '').replace(/\r/g, '').split('\n');
  const fora = (l) => {
    const s = l.trim();
    if (!s) return false;
    if (/^📲/u.test(s)) return true;
    if (/fale com a gente|agende sua visita|chama no whats/i.test(s)) return true;
    if (/wa\.me|whatsapp\.com|https?:\/\/|www\./i.test(s)) return true;
    if (/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/.test(s)) return true; // telefone
    return false;
  };
  const out = linhas.filter(l => !fora(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}
