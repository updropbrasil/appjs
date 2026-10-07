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
