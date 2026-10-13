// Página de material para corretor parceiro: /parceiro/<token>
// Sem logo e sem link para o site. O parceiro baixa as fotos, o vídeo e copia a descrição.
import { notFound } from 'next/navigation';
import { imovelDoToken, textoParaParceiro } from '../../../lib/parceiro.server';
import { formatPreco, ytId } from '../../../lib/format';
import ParceiroClient from './ParceiroClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Material do imóvel',
  robots: { index: false, follow: false },
};

export default async function ParceiroPage({ params }) {
  const im = await imovelDoToken(params.token);
  if (!im) notFound();
  const dados = {
    codigo: im.codigo || '',
    titulo: im.titulo,
    bairro: im.bairro,
    cidade: im.cidade || 'João Pessoa',
    preco: formatPreco(im.preco_cents) + (im.finalidade === 'aluguel' ? '/mês' : ''),
    pausado: im.status !== 'ativo',
    fotos: im.fotos.map(f => ({ url: f.url, thumb: f.thumb_url || f.url })),
    temVideo: !!im.video_file_url,
    youtube: ytId(im.youtube_url) ? `https://youtu.be/${ytId(im.youtube_url)}` : '',
    texto: textoParaParceiro(im.descricao),
  };
  return <ParceiroClient token={params.token} im={dados} />;
}
