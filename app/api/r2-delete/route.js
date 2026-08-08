// Apaga um objeto do Cloudflare R2 a partir da sua URL pública.
// Roda no servidor (as credenciais nunca vão pro navegador).
import { NextResponse } from 'next/server';
import { AwsClient } from 'aws4fetch';
import { R2, r2Configured } from '../../../lib/r2-config.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!r2Configured()) return NextResponse.json({ ok: false, skipped: true });
  try {
    const { url } = await req.json();
    const base = R2.publicBase.replace(/\/$/, '');
    if (!url || !url.startsWith(base)) return NextResponse.json({ ok: false, skipped: true });

    const key = url.slice(base.length + 1); // remove "base/"
    const client = new AwsClient({
      accessKeyId: R2.accessKeyId,
      secretAccessKey: R2.secretAccessKey,
      region: 'auto',
      service: 's3',
    });
    const endpoint = `https://${R2.accountId}.r2.cloudflarestorage.com/${R2.bucket}/${key}`;
    const res = await client.fetch(endpoint, { method: 'DELETE' });
    return NextResponse.json({ ok: res.ok });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) });
  }
}
