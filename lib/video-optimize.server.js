// Comprime um vídeo do imóvel para tocar leve no celular (MP4 720p ~1,5 Mbps).
// Roda no servidor: baixa o original do R2, converte com ffmpeg e sobe a
// versão nova no R2. O original continua guardado no bucket como backup.
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, unlink, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AwsClient } from 'aws4fetch';
import { R2, r2Configured } from './r2-config.server';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

// Vídeos já otimizados terminam com este sufixo no nome.
export const SUFIXO_OTIMIZADO = '-720p.mp4';

export function jaOtimizado(url) {
  return !url || String(url).includes(SUFIXO_OTIMIZADO);
}

function rodarFfmpeg(args) {
  return new Promise((resolve, reject) => {
    let erro = '';
    let p;
    try { p = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] }); }
    catch (e) { return reject(new Error('ffmpeg não encontrado no servidor')); }
    p.stderr.on('data', d => { erro = (erro + d.toString()).slice(-1500); });
    p.on('error', e => reject(new Error(e.code === 'ENOENT' ? 'ffmpeg não encontrado no servidor' : e.message)));
    p.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg falhou: ' + erro.split('\n').filter(Boolean).slice(-2).join(' | '))));
  });
}

export async function otimizarVideo(srcUrl, nomeBase = 'video') {
  if (!r2Configured()) throw new Error('R2 não configurado no servidor');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entrada = join(tmpdir(), `in-${id}`);
  const saida = join(tmpdir(), `out-${id}.mp4`);
  try {
    const res = await fetch(srcUrl);
    if (!res.ok || !res.body) throw new Error('não consegui baixar o vídeo original (HTTP ' + res.status + ')');
    await pipeline(Readable.fromWeb(res.body), createWriteStream(entrada));
    const antes = (await stat(entrada)).size;

    await rodarFfmpeg([
      '-y', '-i', entrada,
      // lado menor em 720 px, mantendo a proporção (vertical ou horizontal)
      '-vf', "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'",
      '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-b:v', '1500k', '-maxrate', '2000k', '-bufsize', '3000k',
      '-c:a', 'aac', '-b:a', '64k', '-ac', '2',
      '-movflags', '+faststart',
      saida,
    ]);
    const depois = (await stat(saida)).size;

    const safe = String(nomeBase).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'video';
    const key = `videos/${id}-${safe}${SUFIXO_OTIMIZADO}`;
    const client = new AwsClient({ accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey, region: 'auto', service: 's3' });
    // URL assinada + envio com tamanho fixo (o R2 recusa envio sem Content-Length)
    const alvo = new URL(`https://${R2.accountId}.r2.cloudflarestorage.com/${R2.bucket}/${key}`);
    alvo.searchParams.set('X-Amz-Expires', '3600');
    const assinado = await client.sign(new Request(alvo, { method: 'PUT' }), { aws: { signQuery: true } });
    const dados = await readFile(saida);
    const up = await fetch(assinado.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(dados.length) },
      body: dados,
    });
    if (!up.ok) throw new Error('falha ao subir a versão leve (HTTP ' + up.status + ')');

    return { url: `${R2.publicBase.replace(/\/$/, '')}/${key}`, antes, depois };
  } finally {
    await unlink(entrada).catch(() => {});
    await unlink(saida).catch(() => {});
  }
}
