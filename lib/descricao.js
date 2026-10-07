// Organiza a descrição do imóvel (texto livre do cadastro) para a página do site.
// O cadastro continua igual — o texto original segue para os portais (feed ZAP) sem mudança.
//
// Separa em:
//  - paragrafos: o texto de abertura, mantendo os parágrafos ("Apartamento para alugar no Bessa…")
//  - itens: as linhas com ✅ (sem repetir o que os cartões da página já mostram)
//  - notas: texto que vem depois da lista ("Aceita financiamento")
// Linhas que a página já mostra em outro lugar (preço 💰, endereço 📍, código 🔖,
// chamada de WhatsApp 📲, aviso de condomínio/IPTU) ficam de fora.

const CHECK = /^(✅|✔️|✔|☑️|☑|•|-(?=\s)|\*(?=\s)|▪️|▪|🔹|✓)\s*/u;
const FORA = /^(💰|📍|🔖|📲|ℹ️|ℹ)/u;
const AVISO = /valores de condom[ií]nio e iptu/i;
const CTA = /^(📲\s*)?fale com a gente/i;

function limpa(s) {
  return String(s || '')
    .replace(/\s+([,.;:!?])/g, '$1')      // "Bessa , em" -> "Bessa, em"
    .replace(/([,;])(?=\S)/g, '$1 ')        // "Campina,Cabedelo" -> "Campina, Cabedelo"
    .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')') // "( retirando )" -> "(retirando)"
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// itens que os cartões (Quartos, Banheiros, Vagas, Área, Andar, Mobília) já mostram
function repeteCartao(t) {
  const s = t.toLowerCase();
  if (/^\d+\s*(banheiros?|vagas?( de garagem)?)$/.test(s)) return true;
  if (/^\d+\s*m(²|2)$/.test(s)) return true;
  if (/^(\d+\s*º?\s*andar|t[ée]rreo)$/.test(s)) return true;
  if (/^(mobiliado|semimobiliado|semi-mobiliado|sem mob[ií]lia|com planejados)$/.test(s)) return true;
  return false;
}

export function organizaDescricao(texto) {
  // 1) linhas limpas; marcador sozinho numa linha ("•") junta com a linha seguinte
  const brutas = String(texto || '').replace(/\r/g, '').split('\n').map((l) => l.trim());
  const linhas = [];
  for (let k = 0; k < brutas.length; k++) {
    const l = brutas[k];
    if (/^(✅|✔️|✔|☑️|☑|•|-|\*|▪️|▪|🔹|✓)$/u.test(l) && k + 1 < brutas.length && brutas[k + 1]) {
      linhas.push('• ' + brutas[++k]);
    } else linhas.push(l);
  }

  const paragrafos = []; // texto antes da lista
  const itens = [];
  const notas = [];      // texto depois da lista
  let viuItem = false;
  let bloco = null;      // parágrafo em montagem

  const fecha = () => {
    if (bloco && bloco.trim()) (viuItem ? notas : paragrafos).push(limpa(bloco));
    bloco = null;
  };

  for (const l0 of linhas) {
    const l = limpa(l0);
    if (!l) { fecha(); continue; }
    if (FORA.test(l) || AVISO.test(l) || CTA.test(l)) { fecha(); continue; }
    if (/^✨.*:$/u.test(l)) { fecha(); continue; } // "✨ Destaques do imóvel:" — a página já tem o título
    if (CHECK.test(l)) {
      fecha();
      viuItem = true;
      let t = limpa(l.replace(CHECK, ''));
      if (!t) continue;
      // "3 quartos (2 suítes)" -> o cartão já mostra os quartos; fica só "2 suítes"
      const q = t.match(/^\d+\s*quartos?\s*(\((\d+)\s*su[ií]tes?\))?$/i);
      if (q) { if (q[2]) itens.push(`${q[2]} ${q[2] === '1' ? 'suíte' : 'suítes'}`); continue; }
      if (repeteCartao(t)) continue;
      t = t.charAt(0).toUpperCase() + t.slice(1);
      if (!itens.includes(t)) itens.push(t);
      continue;
    }
    // texto corrido: linhas seguidas (sem linha em branco entre elas) formam um parágrafo só,
    // o que também conserta frase quebrada no meio ("conforto e\nelegância")
    if (bloco === null) bloco = l;
    else bloco += ' ' + l;
  }
  fecha();
  return { paragrafos, intro: paragrafos.join(' '), itens, notas };
}

// Texto curto e limpo para a descrição do Google/WhatsApp (sem emojis nem lista)
export function resumoDescricao(texto, max = 300) {
  const { intro } = organizaDescricao(texto);
  const r = intro.length > max ? intro.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : intro;
  return r || null;
}
