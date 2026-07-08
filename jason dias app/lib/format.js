// Helpers compartilhados (formatação, YouTube, slug, mobília)
import { WHATSAPP } from './config';


export const MOBILIA_LABELS = {
  mobiliado: 'Mobiliado',
  semi: 'Semimobiliado',
  sem: 'Sem mobília',
  planejados: 'Com planejados'
};

export const MOBILIA_SEO = {
  mobiliado: 'mobiliado',
  semi: 'semimobiliado',
  planejados: 'com planejados',
  sem: ''
};

// Extrai o id do vídeo de qualquer formato do YouTube (watch, youtu.be, shorts, embed)
export function ytId(input) {
  if (!input) return '';
  const s = String(input).trim();
  const m = s.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{6,})/);
  return m ? m[1] : (/^[\w-]{11}$/.test(s) ? s : '');
}

export function ytThumb(id) {
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

export function ytEmbed(id, { autoplay = 1, mute = 1, controls = 1, loop = 1 } = {}) {
  if (!id) return '';
  const p = new URLSearchParams({
    autoplay: String(autoplay), mute: String(mute), controls: String(controls),
    rel: '0', playsinline: '1', modestbranding: '1'
  });
  if (loop) { p.set('loop', '1'); p.set('playlist', id); }
  return `https://www.youtube-nocookie.com/embed/${id}?${p.toString()}`;
}

// centavos -> "R$ 6.500"
export function formatPreco(cents) {
  const v = (Number(cents) || 0) / 100;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// "R$ 6.500" digitado -> centavos
export function parsePreco(str) {
  const n = String(str).replace(/\D/g, '');
  return n ? Number(n) * 100 : 0;
}

// gera slug único a partir do título
export function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

// Título otimizado para SEO — sempre termina em "em João Pessoa"
export function tituloSeo({ categoria, quartos, suites, mobilia, finalidade, bairro }) {
  const cat = categoria === 'Flat / Studio' ? 'Flat' : categoria;
  const parts = [
    cat,
    quartos > 0 ? `${quartos} quartos` : '',
    suites > 0 ? `(${suites} suíte${suites > 1 ? 's' : ''})` : '',
    MOBILIA_SEO[mobilia] || '',
    finalidade === 'aluguel' ? 'para alugar' : 'à venda',
    bairro ? `no ${bairro}, em João Pessoa` : 'em João Pessoa'
  ];
  return parts.filter(Boolean).join(' ');
}

export function whatsappLink(texto) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}
