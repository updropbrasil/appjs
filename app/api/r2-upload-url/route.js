// Gera uma URL assinada (presigned) para o navegador subir o vídeo
// DIRETO pro Cloudflare R2, sem passar pelo servidor. As credenciais
// ficam só aqui no servidor (nunca vão pro navegador).
import { NextResponse } from 'next/server';
import { AwsClient } from 'aws4fetch';
import { R2, r2Configured } from '../../../lib/r2-config.server';
import { createClient } from '../../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  // Só quem está logado no painel pode gerar upload ou apagar arquivos do R2.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });

  if (!r2Configured()) {
    return NextResponse.json({ error: 'R2 não configurado' }, { status: 501 });
  }
  try {
    const { filename, folder } = await req.json();
    const safe = (filename || 'video.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');
    const dir = (folder || 'videos').replace(/[^a-z0-9-]/gi, '');
    const key = `${dir}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;

    const client = new AwsClient({
      accessKeyId: R2.accessKeyId,
      secretAccessKey: R2.secretAccessKey,
      region: 'auto',
      service: 's3',
    });

    const endpoint = `https://${R2.accountId}.r2.cloudflarestorage.com/${R2.bucket}/${key}`;
    const url = new URL(endpoint);
    url.searchParams.set('X-Amz-Expires', '3600');

    const signed = await client.sign(new Request(url, { method: 'PUT' }), {
      aws: { signQuery: true },
    });

    const publicUrl = `${R2.publicBase.replace(/\/$/, '')}/${key}`;
    return NextResponse.json({ uploadUrl: signed.url, publicUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
