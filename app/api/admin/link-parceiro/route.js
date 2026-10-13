// Gera o link de material do imóvel para corretor parceiro (só para quem está logado no painel).
// GET ?id=<uuid> -> { ok: true, url }
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { gerarTokenParceiro, parceiroConfigurado } from '../../../../lib/parceiro.server';
import { SITE_URL } from '../../../../lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, erro: 'não autorizado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id') || '';
  const { data: im } = await supabase.from('imoveis').select('id, codigo, status').eq('id', id).maybeSingle();
  if (!im) return NextResponse.json({ ok: false, erro: 'imóvel não encontrado' }, { status: 404 });
  if (!parceiroConfigurado()) return NextResponse.json({ ok: false, erro: 'Falta configurar PARCEIRO_SECRET (ou a chave do R2) no servidor.' }, { status: 500 });

  const token = gerarTokenParceiro(im.id);
  // usa o domínio por onde o painel foi aberto (funciona no preview e no site final)
  const origem = req.headers.get('x-forwarded-host') ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}` : (new URL(req.url).origin || SITE_URL);
  return NextResponse.json({ ok: true, url: `${origem}/parceiro/${token}`, pausado: im.status !== 'ativo' });
}
