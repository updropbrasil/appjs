import { SUPABASE_URL } from './config';

// Fotos antigas ficaram no Storage do Supabase no tamanho original (250 KB a 900 KB cada).
// Para os cartões da lista, pede ao Supabase uma versão reduzida da mesma foto
// (largura fixa; vem em WebP quando o navegador aceita e fica em cache por 1 ano).
// Fotos do R2 (cadastros novos) já têm miniatura própria e passam direto.
const BASE_PUBLICA = `${String(SUPABASE_URL).replace(/\/$/, '')}/storage/v1/object/public/`;
const BASE_REDUZIDA = `${String(SUPABASE_URL).replace(/\/$/, '')}/storage/v1/render/image/public/`;

export function fotoReduzida(url, largura = 540, qualidade = 70) {
  if (!url || typeof url !== 'string' || !url.startsWith(BASE_PUBLICA) || url.includes('?')) return url;
  return `${BASE_REDUZIDA}${url.slice(BASE_PUBLICA.length)}?width=${largura}&quality=${qualidade}`;
}
