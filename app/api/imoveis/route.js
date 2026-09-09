// Consulta de imóveis para a IA (tool do n8n via HTTP Request).
//   GET https://jasondias.com.br/api/imoveis?k=SENHA&finalidade=aluguel&bairro=cabo+branco&max=7000
//
// Devolve só imóveis ativos, em texto pronto para a IA usar, sem endereço
// exato (a rua nunca vai para o cliente antes da visita agendada).
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL, CATALOGO_TOKEN } from '../../../lib/config';
import { formatPreco, MOBILIA_LABELS } from '../../../lib/format';

export const dynamic = 'force-dynamic';

const num = (v) => {
  const n = Number(String(v ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// "cabo branco" == "Cabo Branco"
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (CATALOGO_TOKEN && searchParams.get('k') !== CATALOGO_TOKEN) {
    return Response.json({ erro: 'não autorizado' }, { status: 401 });
  }

  const finalidade = (searchParams.get('finalidade') || '').toLowerCase();
  const bairro = searchParams.get('bairro');
  const categoria = searchParams.get('categoria');
  const mobilia = searchParams.get('mobilia');
  const min = num(searchParams.get('min'));
  const max = num(searchParams.get('max'));
  const quartos = num(searchParams.get('quartos'));
  const vagas = num(searchParams.get('vagas'));
  const limite = Math.min(num(searchParams.get('limite')) || 8, 25);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const status = (searchParams.get('status') || 'ativo').toLowerCase(); // ativo | pausado | todos
  let q = supabase.from('imoveis').select('*');
  if (status !== 'todos') q = q.eq('status', status === 'pausado' ? 'pausado' : 'ativo');
  // consulta direta por código (?codigo=JDV1019) — ignora o filtro de status
  const codigoQ = searchParams.get('codigo');
  if (codigoQ) q = supabase.from('imoveis').select('*').ilike('codigo', `%${codigoQ.replace(/[^a-z0-9]/gi, '').replace(/^([a-z]+)(\d+)$/i, '$1%$2')}%`);

  if (finalidade === 'aluguel' || finalidade === 'venda') q = q.eq('finalidade', finalidade);
  if (min) q = q.gte('preco_cents', min * 100);
  if (max) q = q.lte('preco_cents', max * 100);
  if (quartos) q = q.gte('quartos', quartos);
  if (vagas) q = q.gte('vagas', vagas);
  if (mobilia) q = q.eq('mobilia', mobilia);

  const { data, error } = await q.order('preco_cents', { ascending: true }).limit(120);
  if (error) return Response.json({ erro: error.message }, { status: 500 });

  // bairro e categoria em memória, para aceitar acento/caixa diferentes
  let lista = data || [];
  if (bairro) lista = lista.filter(i => norm(i.bairro).includes(norm(bairro)));
  if (categoria) lista = lista.filter(i => norm(i.categoria).includes(norm(categoria)));

  const total = lista.length;
  lista = lista.slice(0, limite);

  const imoveis = lista.map(i => ({
    codigo: i.codigo,
    status: i.status,                       // 'ativo' | 'pausado'
    disponivel: i.status === 'ativo',
    titulo: i.titulo,
    finalidade: i.finalidade,
    categoria: i.categoria,
    bairro: i.bairro,
    preco: i.preco_cents ? i.preco_cents / 100 : null,
    preco_formatado: i.preco_cents ? `${formatPreco(i.preco_cents)}${i.finalidade === 'aluguel' ? '/mês' : ''}` : null,
    condominio: i.condominio_tipo === 'isento' ? 'Isento' : (i.condominio_tipo === 'incluso' ? 'Incluso no aluguel' : (i.condominio_tipo === 'nao_informado' ? null : (i.condominio_cents ? i.condominio_cents / 100 : null))),
    quartos: i.quartos ?? null,
    suites: i.suites ?? null,
    banheiros: i.banheiros ?? null,
    vagas: i.vagas ?? null,
    area_m2: i.area_m2 ?? null,
    andar: i.andar || null,
    mobilia: MOBILIA_LABELS[i.mobilia] || null,
    caracteristicas: Array.isArray(i.features) ? i.features : [],
    link: i.slug ? `${SITE_URL}/imovel/${i.slug}` : null,
    tem_video: !!(i.youtube_url || i.video_file_url),
  }));

  // bloco de texto pronto para a IA ler e sugerir ao cliente
  const contexto_ia = imoveis.length
    ? imoveis.map(i => [
      `${i.codigo || '—'} · ${i.titulo}`,
      `  ${i.finalidade === 'aluguel' ? 'Aluguel' : 'Venda'}: ${i.preco_formatado || 'valor não informado'}`
      + (i.condominio ? ` + condomínio ${typeof i.condominio === 'number' ? formatPreco(i.condominio * 100) : i.condominio}` : ''),
      `  ${i.bairro} · ${[i.quartos ? `${i.quartos} quartos` : null, i.suites ? `${i.suites} suítes` : null, i.area_m2 ? `${i.area_m2} m²` : null, i.vagas ? `${i.vagas} vagas` : null, i.mobilia].filter(Boolean).join(' · ')}`,
      i.caracteristicas.length ? `  Lazer: ${i.caracteristicas.slice(0, 8).join(', ')}` : null,
      i.link ? `  ${i.link}` : null,
    ].filter(Boolean).join('\n')).join('\n\n')
    : 'Nenhum imóvel disponível com esses critérios no momento. Ofereça avisar o cliente quando entrar algo parecido, e pergunte se ele tem flexibilidade de bairro ou valor.';

  return Response.json({
    total_encontrados: total,
    mostrando: imoveis.length,
    filtros: { finalidade: finalidade || null, bairro: bairro || null, categoria: categoria || null, min, max, quartos, vagas, mobilia: mobilia || null },
    imoveis,
    contexto_ia,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
