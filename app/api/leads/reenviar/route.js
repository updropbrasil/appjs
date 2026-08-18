// Reenvia ao n8n um lead que falhou. Só para quem está logado no admin.
import { createClient } from '../../../../lib/supabase-server';
import { chamarN8n } from '../zap/route';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, erro: 'não autorizado' }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return Response.json({ ok: false, erro: 'id ausente' }, { status: 400 });

  const { data: lead } = await supabase
    .from('leads')
    .select('*, imoveis(id, titulo, slug, bairro, preco_cents, finalidade, categoria)')
    .eq('id', id).maybeSingle();
  if (!lead) return Response.json({ ok: false, erro: 'lead não encontrado' }, { status: 404 });

  const envio = await chamarN8n(supabase, {
    body: lead.payload || { name: lead.nome, email: lead.email, message: lead.mensagem },
    codigo: lead.codigo_imovel,
    imovel: lead.imoveis || null,
    telefone: lead.telefone,
  });

  await supabase.from('leads').update({
    webhook_status: envio.status,
    webhook_erro: envio.erro,
    webhook_enviado_em: envio.status === 'enviado' ? new Date().toISOString() : null,
    webhook_tentativas: (lead.webhook_tentativas || 0) + 1,
  }).eq('id', id);

  return Response.json({ ok: envio.status === 'enviado', ...envio });
}
