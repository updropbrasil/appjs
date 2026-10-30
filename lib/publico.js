// O que pode ir para o navegador de um imóvel.
// Tudo que o servidor passa para um componente do cliente fica no código-fonte da página,
// então endereço com número, CEP, contato interno e dados de parceiro ficam de fora.
// Vai só a RUA (sem número), para o mapa de localização aproximada.

const PRIVADOS = [
  'endereco', 'numero', 'complemento', 'cep', 'contato_interno',
  'parceiro_id', 'parceiro_pct', 'parceiro_nome', 'parceiro_whatsapp', 'parceiros', 'captacao',
  'zap_ativo', 'zap_destaque',
];

// "Rua Benjamin Rabelo, 123, apto 501" -> "Rua Benjamin Rabelo"
export function ruaSemNumero(endereco) {
  const e = String(endereco || '').trim();
  if (!/^(rua|r\.|av\.?|avenida|al\.|alameda|travessa|tv\.|rodovia|estrada|pra[çc]a)(\s|$)/i.test(e)) return null;
  const r = e
    .replace(/\bs\/n\b/gi, ' ')
    .split(/[,(;\/|–—]|\s-\s|\s(ap|apto|apt|bloco|bl|casa|lote|qd|quadra|n[º°o]\.?)\b/i)[0] // só até a 1ª vírgula, parêntese ou "ap/bloco/nº"
    .replace(/\d[\d\s().-]*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\s,.-]+$/, '')
    .trim();
  if (/projetad/i.test(r)) return null; // "Rua projetada" não ajuda no mapa
  return r.length >= 6 ? r : null;
}

export function imovelPublico(im) {
  if (!im) return im;
  const o = { ...im };
  o.rua = ruaSemNumero(im.endereco);
  for (const k of PRIVADOS) delete o[k];
  return o;
}

// Versão enxuta para os cartões (home e "imóveis parecidos"): só o que o cartão, a busca
// e a ordenação usam, e só a primeira foto. Antes ia o cadastro inteiro com todas as fotos
// e a descrição de todos os imóveis, e o HTML da home passava de 450 KB.
const CAMPOS_CARTAO = [
  'id', 'slug', 'codigo', 'titulo', 'categoria', 'finalidade', 'bairro', 'preco_cents',
  'quartos', 'banheiros', 'vagas', 'area_m2', 'mobilia', 'youtube_url', 'video_file_url',
  'capa_url', 'destaque', 'created_at',
];

export function cardPublico(im) {
  if (!im) return im;
  const o = {};
  for (const k of CAMPOS_CARTAO) if (im[k] !== undefined) o[k] = im[k];
  const fotos = (im.imovel_fotos || []).slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  o.imovel_fotos = fotos.slice(0, 1).map(f => ({ url: f.url, thumb_url: f.thumb_url, ordem: f.ordem }));
  return o;
}
