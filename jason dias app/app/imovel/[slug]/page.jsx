import { notFound } from 'next/navigation';
import { createClient } from '../../../lib/supabase-server';
import DetailClient from './DetailClient';
import { formatPreco, MOBILIA_SEO } from '../../../lib/format';

export const revalidate = 60;

async function getImovel(slug) {
  const supabase = createClient();
  const { data } = await supabase.from('imoveis').select('*').eq('slug', slug).eq('status', 'ativo').maybeSingle();
  if (!data) return null;
  const { data: fotos } = await supabase.from('imovel_fotos').select('url, ordem').eq('imovel_id', data.id).order('ordem');
  return { ...data, fotos: fotos || [] };
}

// SEO por imóvel — title na fórmula, description e OG
export async function generateMetadata({ params }) {
  const im = await getImovel(params.slug);
  if (!im) return { title: 'Imóvel não encontrado' };
  const title = im.titulo;
  const description = (im.descricao || `${im.categoria} ${MOBILIA_SEO[im.mobilia] || ''} ${im.finalidade === 'aluguel' ? 'para alugar' : 'à venda'} no ${im.bairro}, em João Pessoa.`).trim();
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
    description: im.descricao || undefined,
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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(im)) }} />
      <DetailClient im={im} precoFmt={formatPreco(im.preco_cents)} />
    </>
  );
}
