// Otimiza o vídeo de um imóvel (só para quem está logado no painel).
// POST { id }  -> começa a compressão em segundo plano e responde na hora.
// GET  ?id=... -> diz como está: 'rodando', 'pronto' (com os tamanhos) ou 'erro'.
// Assim nenhum pedido fica aberto por minutos (proxies cortam pedidos longos).
import { NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase-server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../../lib/config';
import { otimizarVideo, jaOtimizado } from '../../../../lib/video-optimize.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// estado dos trabalhos em memória (o site roda num único servidor)
const trabalhos = globalThis.__otimizacaoVideos || (globalThis.__otimizacaoVideos = new Map());
let fila = globalThis.__filaVideos || (globalThis.__filaVideos = Promise.resolve());

async function usuario() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(req) {
  const { supabase, user } = await usuario();
  if (!user) return NextResponse.json({ ok: false, erro: 'não autorizado' }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, erro: 'id ausente' }, { status: 400 });

  const atual = trabalhos.get(id);
  if (atual && (atual.status === 'rodando' || atual.status === 'na fila')) return NextResponse.json({ ok: true, ...atual });

  const { data: im, error } = await supabase.from('imoveis').select('id, codigo, video_file_url').eq('id', id).maybeSingle();
  if (error || !im) return NextResponse.json({ ok: false, erro: 'imóvel não encontrado' }, { status: 404 });
  if (jaOtimizado(im.video_file_url)) return NextResponse.json({ ok: true, status: 'pronto', pulado: true });

  // cliente próprio com o token de quem pediu: o trabalho termina depois que o pedido já acabou
  const { data: { session } } = await supabase.auth.getSession();
  const db = createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session?.access_token || ''}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  trabalhos.set(id, { status: 'na fila', codigo: im.codigo, inicio: Date.now() });
  // um vídeo por vez, para não pesar o servidor
  fila = globalThis.__filaVideos = fila.then(async () => {
    trabalhos.set(id, { status: 'rodando', codigo: im.codigo, inicio: Date.now() });
    try {
      const r = await otimizarVideo(im.video_file_url, im.codigo || 'video');
      if (r.depois >= r.antes) {
        trabalhos.set(id, { status: 'pronto', codigo: im.codigo, pulado: true, motivo: 'o original já era leve' });
        return;
      }
      // grava o link novo; se o token já tiver vencido, o painel grava ao receber o 'pronto'
      const { data: upd, error: upErr } = await db.from('imoveis').update({ video_file_url: r.url }).eq('id', im.id).select('id');
      trabalhos.set(id, { status: 'pronto', codigo: im.codigo, url: r.url, gravado: !upErr && (upd || []).length > 0, antesMB: +(r.antes / 1048576).toFixed(1), depoisMB: +(r.depois / 1048576).toFixed(1) });
    } catch (e) {
      trabalhos.set(id, { status: 'erro', codigo: im.codigo, erro: String(e?.message || e) });
    }
  });
  return NextResponse.json({ ok: true, status: 'na fila' });
}

export async function GET(req) {
  const { user } = await usuario();
  if (!user) return NextResponse.json({ ok: false, erro: 'não autorizado' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  return NextResponse.json({ ok: true, ...(trabalhos.get(id) || { status: 'desconhecido' }) });
}
