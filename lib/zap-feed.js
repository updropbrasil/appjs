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

// características que o corretor marca no cadastro -> Feature do VRSync
// (rótulo em português = chave que gravamos no banco)
export const FEATURES = {
  // área de lazer do condomínio
  'Piscina': 'Pool',
  'Piscina infantil': 'Kids Pool',
  'Piscina privativa': 'Private Pool',
  'Academia': 'Gym',
  'Salão de festas': 'Party Room',
  'Salão de jogos': 'Game room',
  'Churrasqueira': 'BBQ',
  'Espaço gourmet': 'Gourmet Space',
  'Playground': 'Playground',
  'Quadra poliesportiva': 'Sports Court',
  'Quadra de tênis': 'Tennis Court',
  'Sauna': 'Sauna',
  'Spa': 'Spa',
  'Cinema': 'Cinema',
  'Coworking': 'Coworking',
  'Espaço pet': 'Pet Space',
  'Lavanderia': 'Laundry',
  'Mini mercado': 'Mini Market',
  'Bicicletário': 'Bicycles Place',
  'Vestiário': 'Dressing Room',

  // serviços e segurança
  'Portaria 24h': 'Concierge 24h',
  'Segurança 24h': 'Security Guard on Duty',
  'Circuito de segurança': 'Security Camera',
  'Alarme': 'Alarm System',
  'Portão eletrônico': 'Electronic Gate',
  'Interfone': 'Intercom',
  'Elevador': 'Elevator',
  'Gerador': 'Generator',
  'Energia solar': 'Solar Energy',
  'Condomínio fechado': 'Fenced Yard',
  'Acesso para deficientes': 'Disabled Access',

  // do imóvel
  'Varanda gourmet': 'Gourmet Balcony',
  'Varanda': 'Balcony',
  'Vista para o mar': 'Ocean View',
  'Ar condicionado': 'Cooling',
  'Aquecimento': 'Heating',
  'Closet': 'Closet',
  'Cozinha americana': 'American Kitchen',
  'Cozinha planejada': 'Kitchen Cabinets',
  'Lavabo': 'Lavabo',
  'Área de serviço': "Maid's Quarters",
  'Escritório': 'Home Office',
  'Despensa': 'Pantry',
  'Hidromassagem': 'Hydromassage',
  'Lareira': 'Fireplace',
  'Quintal': 'Backyard',
  'Jardim': 'Garden',
  'Permite animais': 'Pets Allowed',
  'Mobiliado': 'Furnished',
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cdata = (s) => `<![CDATA[${String(s == null ? '' : s).replace(/]]>/g, ']]&gt;')}]]>`;

const inteiro = (cents) => Math.round((Number(cents) || 0) / 100);

const semHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// CEP válido = 8 dígitos. O portal recusa qualquer coisa fora disso.
export const cepValido = (cep) => String(cep || '').replace(/\D/g, '').length === 8;

// compara códigos ignorando hífen, espaço e maiúscula: "jdv1019" acha "JDV-1019"
export const normCodigo = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

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
  // o portal exibe em moldura horizontal — mandamos a versão deitada (wide_url)
  // quando existe; senão a original. Sempre .jpg, como o portal exige.
  return (im.imovel_fotos || [])
    .slice()
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map(f => f.wide_url || f.url)
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
  if (!cepValido(im.cep)) return `CEP inválido (${im.cep}) — precisa ter 8 dígitos`;
  if (!im.preco_cents) return 'sem valor';
  if (!im.area_m2) return 'sem área (m²)';
  if (!PROPERTY_TYPE[im.categoria]) return `categoria "${im.categoria}" não mapeada`;
  const t = tituloFeed(im);
  if (t.length < 10) return 'título muito curto (mínimo 10 caracteres)';
  return null;
}

// Pontuação de qualidade do anúncio para os portais.
// Baseado no que o Grupo OLX considera para posicionamento: anúncio completo,
// endereço completo (busca por mapa), muitas fotos, vídeo e descrição rica.
export function qualidadeAnuncio(im) {
  const fotos = fotosFeed(im).length;
  const desc = semHtml(im.descricao).length;
  const itens = [
    { ok: fotos >= 5, peso: 25, label: `${fotos} fotos`, dica: 'mínimo 5 — o portal recusa abaixo disso' },
    { ok: fotos >= 10, peso: 10, label: '10+ fotos', dica: 'anúncios com 10+ fotos aparecem melhor' },
    { ok: !!im.cep && cepValido(im.cep), peso: 12, label: 'CEP válido', dica: im.cep ? `“${im.cep}” não tem 8 dígitos` : 'obrigatório pelo portal' },
    { ok: !!im.endereco, peso: 10, label: 'Rua', dica: 'melhora a busca por mapa (o portal exibe só o bairro)' },
    { ok: !!im.numero, peso: 5, label: 'Número', dica: 'completa o endereço para o mapa' },
    { ok: !!im.area_m2, peso: 8, label: 'Área (m²)', dica: 'obrigatório pelo portal' },
    { ok: desc >= 300, peso: 12, label: 'Descrição rica', dica: `${desc} caracteres — mire em 300+` },
    { ok: !!ytId(im.youtube_url), peso: 8, label: 'Vídeo do YouTube', dica: 'anúncio com vídeo recebe mais contatos' },
    { ok: (Array.isArray(im.features) ? im.features.length : 0) >= 4, peso: 6, label: '4+ características', dica: 'piscina, academia, varanda…' },
    { ok: !!im.ano_construcao, peso: 4, label: 'Ano de construção', dica: 'completa o anúncio' },
  ];
  const score = itens.filter(i => i.ok).reduce((s, i) => s + i.peso, 0);
  return { score, itens, faltando: itens.filter(i => !i.ok) };
}

function listingXml(im, contato) {
  const aluguel = im.finalidade === 'aluguel';
  const fotos = fotosFeed(im);
  const vid = ytId(im.youtube_url);
  const features = [];
  if (MOBILIA_FEATURE[im.mobilia]) features.push(MOBILIA_FEATURE[im.mobilia]);
  if (im.vagas > 0) features.push('Parking Garage');
  (Array.isArray(im.features) ? im.features : []).forEach(f => {
    if (FEATURES[f] && !features.includes(FEATURES[f])) features.push(FEATURES[f]);
  });

  return `    <Listing>
      <ListingID>${esc(im.codigo || im.id)}</ListingID>
      <Title>${cdata(tituloFeed(im))}</Title>
      <TransactionType>${aluguel ? 'For Rent' : 'For Sale'}</TransactionType>
      <PublicationType>${esc(im.zap_destaque || 'STANDARD')}</PublicationType>
      <Location displayAddress="Neighborhood">
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="PB">${cdata('Paraíba')}</State>
        <City>${cdata('João Pessoa')}</City>
        <Neighborhood>${cdata(im.bairro)}</Neighborhood>${im.endereco ? `
        <Address>${cdata(im.endereco)}</Address>` : ''}${im.numero ? `
        <StreetNumber>${esc(im.numero)}</StreetNumber>` : ''}${im.complemento ? `
        <Complement>${cdata(im.complemento)}</Complement>` : ''}
        <PostalCode>${esc(im.cep)}</PostalCode>
      </Location>
      <Details>
        <PropertyType>${esc(PROPERTY_TYPE[im.categoria])}</PropertyType>
        <UsageType>${im.categoria === 'Comercial' ? 'Commercial' : 'Residential'}</UsageType>
        <Description>${cdata(descricaoFeed(im))}</Description>
        <LivingArea unit="square metres">${Math.round(Number(im.area_m2) || 0)}</LivingArea>
${aluguel
      ? `        <RentalPrice currency="BRL" period="Monthly">${inteiro(im.preco_cents)}</RentalPrice>`
      : `        <ListPrice currency="BRL">${inteiro(im.preco_cents)}</ListPrice>`}${im.condominio_tipo !== 'nao_informado' && im.condominio_cents != null ? `
        <PropertyAdministrationFee currency="BRL">${inteiro(im.condominio_cents)}</PropertyAdministrationFee>` : ''}${im.iptu_tipo !== 'nao_informado' && im.iptu_cents != null ? `
        <Iptu currency="BRL" period="Yearly">${inteiro(im.iptu_cents)}</Iptu>` : ''}${im.quartos ? `
        <Bedrooms>${im.quartos}</Bedrooms>` : ''}${im.banheiros ? `
        <Bathrooms>${im.banheiros}</Bathrooms>` : ''}${im.suites ? `
        <Suites>${im.suites}</Suites>` : ''}${im.vagas ? `
        <Garage>${im.vagas}</Garage>` : ''}${/^\d+$/.test(String(im.andar || '').replace(/\D/g, '')) && String(im.andar || '').replace(/\D/g, '') ? `
        <UnitFloor>${String(im.andar).replace(/\D/g, '')}</UnitFloor>` : ''}${im.ano_construcao ? `
        <YearBuilt>${Number(im.ano_construcao)}</YearBuilt>` : ''}${features.length ? `
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
