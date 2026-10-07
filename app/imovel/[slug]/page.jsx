import { notFound } from 'next/navigation';
import { createPublicClient as createClient, whatsappDoSite } from '../../../lib/supabase-public';
import DetailClient from './DetailClient';
import { formatPreco, MOBILIA_SEO } from '../../../lib/format';
import { parecidosCom } from '../../../lib/busca';
import { resumoDescricao } from '../../../lib/descricao';

export const revalidate = 60;
// Gera cada imóvel na primeira visita e guarda pronto (atualiza a cada 60 s).
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

async function getImovel(slug) {
  const supabase = createClient();
  const { data } = await supabase.from('imoveis').select('*').eq('slug', slug).eq('status', 'ativo').maybeSingle();
  if (!data) return null;
  const { data: fotos } = await supabase.from('imovel_fotos').select('url, thumb_url, ordem').eq('imovel_id', data.id).order('ordem');
  return { ...data, fotos: fotos || [] };
}

// Imóveis parecidos (mesma finalidade, bairro e preço próximos) para a pessoa
// continuar olhando sem ter que voltar para a home.
async function getParecidos(im) {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('imoveis')
      .select('*, imovel_fotos(url, thumb_url, ordem)')
      .eq('status', 'ativo')
      .eq('finalidade', im.finalidade)
      .neq('id', im.id)
      .limit(200);
    return parecidosCom(im, data || [], 8);
  } catch (e) { return []; }
}

// SEO por imóvel — title na fórmula, description e OG
export async function generateMetadata({ params }) {
  const im = await getImovel(params.slug);
  if (!im) return { title: 'Imóvel não encontrado' };
  const title = im.titulo;
  const description = (resumoDescricao(im.descricao) || `${im.categoria} ${MOBILIA_SEO[im.mobilia] || ''} ${im.finalidade === 'aluguel' ? 'para alugar' : 'à venda'} no ${im.bairro}, em João Pessoa.`).trim();
  const img = im.capa_url || (im.video_id ? `https://i.ytimg.com/vi/${im.video_id}/maxresdefault.jpg` : undefined);
  return {
    title,
    description,
    alternates: { canonical: `/imovel/${im.slug}` },
    openGraph: { title, description, images: img ? [img] : [], type: 'website' }
  };
}

// Dados estruturados schema.org — aparece com preço direto no Google
function jsonLd(im) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Product', 'Residence'],
    name: im.titulo,
    description: resumoDescricao(im.descricao) || undefined,
    category: im.categoria,
    offers: {
      '@type': 'Offer',
      price: (im.preco_cents / 100).toFixed(0),
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      businessFunction: im.finalidade === 'aluguel' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell'
    },
    address: { '@type': 'PostalAddress', addressLocality: im.cidade || 'João Pessoa', addressRegion: im.estado || 'PB', addressCountry: 'BR', neighborhood: im.bairro }
  };
}

export default async function ImovelPage({ params }) {
  const im = await getImovel(params.slug);
  if (!im) notFound();
  const [parecidos, whats] = await Promise.all([getParecidos(im), whatsappDoSite(createClient())]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(im)) }} />
      <DetailClient im={im} precoFmt={formatPreco(im.preco_cents)} parecidos={parecidos} whats={whats} />
    </>
  );
}
