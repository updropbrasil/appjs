// Baixa o vídeo do imóvel como arquivo (link de parceiro).
// Repassa o vídeo do R2 com "attachment", para o navegador salvar em vez de abrir o player.
import { imovelDoToken } from '../../../../../lib/parceiro.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const im = await imovelDoToken(params.token);
  if (!im) return new Response('Link inválido', { status: 404 });
  if (!im.video_file_url) return new Response('Este imóvel não tem vídeo para baixar', { status: 404 });

  const cabecalhos = {};
  const range = req.headers.get('range');
  if (range) cabecalhos.Range = range; // permite retomar o download

  const origem = await fetch(im.video_file_url, { headers: cabecalhos, cache: 'no-store' });
  if (!origem.ok && origem.status !== 206) return new Response('Não consegui buscar o vídeo agora. Tente de novo.', { status: 502 });

  const codigo = (im.codigo || 'imovel').replace(/[^\w-]/g, '');
  const h = new Headers();
  h.set('Content-Type', origem.headers.get('content-type') || 'video/mp4');
  for (const k of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = origem.headers.get(k);
    if (v) h.set(k, v);
  }
  h.set('Content-Disposition', `attachment; filename="${codigo}-video.mp4"`);
  h.set('Cache-Control', 'private, no-store');
  return new Response(origem.body, { status: origem.status, headers: h });
}
