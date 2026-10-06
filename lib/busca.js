// Busca da home: normalização de texto, filtros no link e memória da busca.
// Os filtros ficam na URL (?f=aluguel&q=manaira&quartos=2...) para dar para
// compartilhar e para a busca continuar igual quando a pessoa volta de um imóvel.

// "Manaíra" -> "manaira"; "JDV-1019" -> "jdv1019" (usado só para comparar)
export const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const soLetrasNumeros = (s) => semAcento(s).replace(/[^a-z0-9]/g, '');

export const FILTROS_PADRAO = { f: 'todos', q: '', tipo: 'todos', min: '', max: '', mob: 'todos', quartos: '', ordem: 'relevancia' };

export function filtrosDaUrl(search) {
  const p = new URLSearchParams(search || '');
  const r = { ...FILTROS_PADRAO };
  Object.keys(r).forEach(k => { const v = p.get(k); if (v != null && v !== '') r[k] = v; });
  if (!['todos', 'aluguel', 'venda'].includes(r.f)) r.f = 'todos';
  r.min = String(r.min).replace(/\D/g, '');
  r.max = String(r.max).replace(/\D/g, '');
  r.quartos = String(r.quartos).replace(/\D/g, '').slice(0, 1);
  return r;
}

export function urlDosFiltros(fl) {
  const p = new URLSearchParams();
  Object.entries(fl).forEach(([k, v]) => { if (v !== '' && v != null && v !== FILTROS_PADRAO[k]) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Memória da última busca (para o "Voltar aos imóveis" e a posição da lista).
// sessionStorage pode falhar (aba anônima, bloqueio), então tudo fica em try/catch.
const CHAVE_BUSCA = 'jd_ultima_busca';
const CHAVE_ROLAGEM = 'jd_rolagem_lista';

export function lembrarBusca(query) {
  try { sessionStorage.setItem(CHAVE_BUSCA, query || ''); } catch (e) {}
}
export function ultimaBusca() {
  try { return sessionStorage.getItem(CHAVE_BUSCA) || ''; } catch (e) { return ''; }
}
export function lembrarRolagem(query) {
  try { sessionStorage.setItem(CHAVE_ROLAGEM, JSON.stringify({ q: query || '', y: Math.round(window.scrollY) })); } catch (e) {}
}
// devolve a posição salva se ela for da mesma busca, e apaga (só vale uma vez)
export function pegarRolagem(query) {
  try {
    const raw = sessionStorage.getItem(CHAVE_ROLAGEM);
    sessionStorage.removeItem(CHAVE_ROLAGEM);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.q === (query || '') && d.y > 0 ? d.y : null;
  } catch (e) { return null; }
}

// Imóveis parecidos: mesma finalidade; pontua bairro, faixa de preço, quartos e tipo.
export function parecidosCom(atual, todos, max = 8) {
  const preco = Number(atual.preco_cents) || 0;
  return (todos || [])
    .filter(i => i.id !== atual.id && i.finalidade === atual.finalidade)
    .map(i => {
      let pts = 0;
      if (semAcento(i.bairro) === semAcento(atual.bairro)) pts += 3;
      if (preco > 0 && i.preco_cents) {
        const dif = Math.abs(i.preco_cents - preco) / preco;
        pts += dif <= 0.15 ? 3 : dif <= 0.3 ? 2 : dif <= 0.5 ? 1 : 0;
      }
      if (atual.quartos && i.quartos === atual.quartos) pts += 1.5;
      if (atual.categoria && i.categoria === atual.categoria) pts += 1;
      return { i, pts };
    })
    .sort((a, b) => b.pts - a.pts || Math.abs(a.i.preco_cents - preco) - Math.abs(b.i.preco_cents - preco))
    .slice(0, max)
    .map(x => x.i);
}
