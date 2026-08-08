// Gera o XML no padrão VRSync (Grupo OLX — Zap Imóveis, VivaReal, OLX).
// Documentação: developers.grupozap.com/feeds/vrsync
//
// Regras que o feed respeita automaticamente:
//  · Title entre 10 e 100 caracteres, sem HTML
//  · Description entre 50 e 3.000 caracteres, sem HTML (gera texto se faltar)
//  · Preços em número inteiro, sem R$, ponto ou vírgula
//  · Mínimo de 5 fotos .jpg por anúncio (anúncio sem isso é omitido)
//  · Somente vídeo do YouTube (um por imóvel) — MP4 próprio não é aceito
//  · Location com Country/State/City/Neighborhood + CEP
//  · Conteúdo de texto envolvido em CDATA (evita erro de acento)

import { MOBILIA_SEO, ytId } from './format';

// categoria do nosso cadastro -> PropertyType do VRSync
const PROPERTY_TYPE = {
  'Apartamento': 'Residential / Apartment',
  'Casa': 'Residential / Home',
  'Cobertura': 'Residential / Penthouse',
  'Flat / Studio': 'Residential / Flat',
  'Comercial': 'Commercial / Office',
};

// mobília do nosso cadastro -> Feature do VRSync
const MOBILIA_FEATURE = {
  mobiliado: 'Furnished',
  planejados: 'Planned Furniture',
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cdata = (s) => `<![CDATA[${String(s == null ? '' : s).replace(/]]>/g, ']]&gt;')}]]>`;

const inteiro = (cents) => Math.round((Number(cents) || 0) / 100);

const semHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Title precisa ter 10–100 caracteres
function tituloFeed(im) {
  let t = semHtml(im.titulo);
  if (t.length > 100) {
    t = t.slice(0, 100);
    t = t.slice(0, t.lastIndexOf(' ') > 40 ? t.lastIndexOf(' ') : 100).trim();
  }
  if (t.length < 10) {
    t = `${im.categoria || 'Imóvel'} ${im.finalidade === 'aluguel' ? 'para alugar' : 'à venda'} no ${im.bairro || 'João Pessoa'}`;
  }
  return t;
}

// Description precisa ter 50–3.000 caracteres
function descricaoFeed(im) {
  let d = semHtml(im.descricao);
  if (d.length >= 50) return d.slice(0, 3000);

  const partes = [
    `${im.categoria || 'Imóvel'} ${MOBILIA_SEO[im.mobilia] || ''} ${im.finalidade === 'aluguel' ? 'para alugar' : 'à venda'} no ${im.bairro || 'João Pessoa'}, em João Pessoa.`.replace(/\s+/g, ' '),
    im.area_m2 ? `Área útil de ${im.area_m2} m².` : '',
    im.quartos ? `${im.quartos} quarto${im.quartos > 1 ? 's' : ''}${im.suites ? `, sendo ${im.suites} suíte${im.suites > 1 ? 's' : ''}` : ''}.` : '',
    im.banheiros ? `${im.banheiros} banheiro${im.banheiros > 1 ? 's' : ''}.` : '',
    im.vagas ? `${im.vagas} vaga${im.vagas > 1 ? 's' : ''} de garagem.` : '',
    im.andar ? `Andar: ${im.andar}.` : '',
    im.referencia ? `Referência: ${im.referencia}.` : '',
    d,
    'Agende sua visita e fale com um corretor pelo portal.',
  ].filter(Boolean);

  let out = partes.join(' ');
  if (out.length < 50) out += ' Entre em contato para mais informações sobre este imóvel em João Pessoa.';
  return out.slice(0, 3000);
}

function fotosFeed(im) {
  // só as versões grandes, em .jpg (o portal não aceita outro formato)
  return (im.imovel_fotos || [])
    .slice()
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map(f => f.url)
    .filter(u => u && /^https:\/\//i.test(u) && /\.jpe?g(\?|$)/i.test(u));
}

// Um anúncio só é aceito com 5+ fotos. Devolve o motivo quando não estiver pronto.
export function motivoInapto(im) {
  if (im.status !== 'ativo') return 'pausado';
  if (im.zap_ativo === false) return 'desligado para portais';
  const fotos = fotosFeed(im);
  if (fotos.length < 5) return `só ${fotos.length} foto(s) — o portal exige 5`;
  if (!im.bairro) return 'sem bairro';
  if (!im.cep) return 'sem CEP';
  if (!im.preco_cents) return 'sem valor';
  if (!im.area_m2) return 'sem área (m²)';
  if (!PROPERTY_TYPE[im.categoria]) return `categoria "${im.categoria}" não mapeada`;
  return null;
}

function listingXml(im, contato) {
  const aluguel = im.finalidade === 'aluguel';
  const fotos = fotosFeed(im);
  const vid = ytId(im.youtube_url);
  const features = [];
  if (MOBILIA_FEATURE[im.mobilia]) features.push(MOBILIA_FEATURE[im.mobilia]);
  if (im.vagas > 0) features.push('Parking Garage');

  return `    <Listing>
      <ListingID>${esc(im.codigo || im.id)}</ListingID>
      <Title>${cdata(tituloFeed(im))}</Title>
      <TransactionType>${aluguel ? 'For Rent' : 'For Sale'}</TransactionType>
      <PublicationType>${esc(im.zap_destaque || 'STANDARD')}</PublicationType>
      <Location displayAddress="${im.endereco ? 'Street' : 'Neighborhood'}">
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="PB">${cdata('Paraíba')}</State>
        <City>${cdata('João Pessoa')}</City>
        <Neighborhood>${cdata(im.bairro)}</Neighborhood>${im.endereco ? `
        <Address>${cdata(im.endereco)}</Address>` : ''}
        <PostalCode>${esc(im.cep)}</PostalCode>
      </Location>
      <Details>
        <PropertyType>${esc(PROPERTY_TYPE[im.categoria])}</PropertyType>
        <UsageType>${im.categoria === 'Comercial' ? 'Commercial' : 'Residential'}</UsageType>
        <Description>${cdata(descricaoFeed(im))}</Description>
        <LivingArea unit="square metres">${Math.round(Number(im.area_m2) || 0)}</LivingArea>
${aluguel
      ? `        <RentalPrice currency="BRL" period="Monthly">${inteiro(im.preco_cents)}</RentalPrice>`
      : `        <ListPrice currency="BRL">${inteiro(im.preco_cents)}</ListPrice>`}${im.condominio_cents ? `
        <PropertyAdministrationFee currency="BRL">${inteiro(im.condominio_cents)}</PropertyAdministrationFee>` : ''}${im.iptu_cents ? `
        <Iptu currency="BRL" period="Yearly">${inteiro(im.iptu_cents)}</Iptu>` : ''}${im.quartos ? `
        <Bedrooms>${im.quartos}</Bedrooms>` : ''}${im.banheiros ? `
        <Bathrooms>${im.banheiros}</Bathrooms>` : ''}${im.suites ? `
        <Suites>${im.suites}</Suites>` : ''}${im.vagas ? `
        <Garage>${im.vagas}</Garage>` : ''}${/^\d+$/.test(String(im.andar || '').replace(/\D/g, '')) && String(im.andar || '').replace(/\D/g, '') ? `
        <UnitFloor>${String(im.andar).replace(/\D/g, '')}</UnitFloor>` : ''}${features.length ? `
        <Features>
${features.map(f => `          <Feature>${esc(f)}</Feature>`).join('\n')}
        </Features>` : ''}
      </Details>
      <Media>${vid ? `
        <Item medium="video">https://www.youtube.com/watch?v=${esc(vid)}</Item>` : ''}
${fotos.map((u, i) => `        <Item medium="image" caption="foto${i + 1}"${i === 0 ? ' primary="true"' : ''}>${esc(u)}</Item>`).join('\n')}
      </Media>
      <ContactInfo>
        <Name>${cdata(contato.nome)}</Name>
        <Email>${esc(contato.email)}</Email>${contato.telefone ? `
        <Telephone>${esc(contato.telefone)}</Telephone>` : ''}${contato.site ? `
        <Website>${esc(contato.site)}</Website>` : ''}${contato.logo ? `
        <Logo>${esc(contato.logo)}</Logo>` : ''}
        <Location>
          <Country abbreviation="BR">Brasil</Country>
          <State abbreviation="PB">${cdata('Paraíba')}</State>
          <City>${cdata('João Pessoa')}</City>
        </Location>
      </ContactInfo>
    </Listing>`;
}

export function buildZapFeed(imoveis, contato) {
  const aptos = (imoveis || []).filter(im => !motivoInapto(im));
  const publish = new Date().toISOString().slice(0, 19);

  return `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">
  <Header>
    <Provider>${cdata(contato.nome)}</Provider>
    <Email>${esc(contato.email)}</Email>
    <ContactName>${cdata(contato.contato || contato.nome)}</ContactName>
    <PublishDate>${publish}</PublishDate>
    <Telephone>${esc(contato.telefone)}</Telephone>
  </Header>
  <Listings>
${aptos.map(im => listingXml(im, contato)).join('\n')}
  </Listings>
</ListingDataFeed>
`;
}
