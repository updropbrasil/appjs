// Baixa todas as fotos do imóvel num .zip (link de parceiro).
import { imovelDoToken } from '../../../../../lib/parceiro.server';
import { montarZip } from '../../../../../lib/zip.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const im = await imovelDoToken(params.token);
  if (!im) return new Response('Link inválido', { status: 404 });
  if (!im.fotos.length) return new Response('Este imóvel não tem fotos', { status: 404 });

  const codigo = (im.codigo || 'imovel').replace(/[^\w-]/g, '');
  const arquivos = [];
  // 4 por vez, para não abrir muitas conexões de uma só vez
  for (let i = 0; i < im.fotos.length; i += 4) {
    const lote = im.fotos.slice(i, i + 4);
    const res = await Promise.all(lote.map(async (f, j) => {
      try {
        const r = await fetch(f.url, { cache: 'no-store' });
        if (!r.ok) return null;
        const m = f.url.match(/\.(png|webp)(\?|$)/i);
        const ext = m ? m[1].toLowerCase() : 'jpg';
        return { nome: `${codigo}-foto-${String(i + j + 1).padStart(2, '0')}.${ext}`, dados: Buffer.from(await r.arrayBuffer()) };
      } catch (e) { return null; }
    }));
    res.forEach(a => { if (a) arquivos.push(a); });
  }
  if (!arquivos.length) return new Response('Não consegui buscar as fotos agora. Tente de novo.', { status: 502 });

  const zip = montarZip(arquivos);
  return new Response(zip, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Length': String(zip.length),
      'Content-Disposition': `attachment; filename="${codigo}-fotos.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
