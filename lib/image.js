// Reprocessa imagens no próprio navegador: reduz e recomprime.
// Usado no cadastro (fotos novas) e na otimização das fotos antigas.

export function compressBlob(blob, maxDim = 1600, quality = 0.8) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const m = Math.max(width, height);
      if (m > maxDim) { const s = maxDim / m; width = Math.round(width * s); height = Math.round(height * s); }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      c.toBlob(b => resolve(b || blob), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// Gera a versão HORIZONTAL (4:3) que os portais exigem, a partir de uma foto
// em pé. Não distorce: preenche o quadro deitado com a foto centralizada e,
// atrás, uma cópia borrada dela — bem melhor que tarja preta.
export function toWideBlob(blob, w = 1280, h = 960, quality = 0.82) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const r = img.width / img.height;

      if (r >= w / h) {
        // já é deitada: recorta o excesso das laterais
        const sw = img.height * (w / h);
        ctx.drawImage(img, (img.width - sw) / 2, 0, sw, img.height, 0, 0, w, h);
      } else {
        // foto em pé: fundo borrado + foto inteira centralizada
        const bw = h * r, bh = h;
        const s = Math.max(w / bw, 1.25);
        ctx.filter = 'blur(28px) brightness(.72)';
        ctx.drawImage(img, (w - bw * s) / 2, (h - bh * s) / 2, bw * s, bh * s);
        ctx.filter = 'none';
        const fw = h * r;
        ctx.drawImage(img, (w - fw) / 2, 0, fw, h);
      }
      URL.revokeObjectURL(url);
      c.toBlob(b => resolve(b || blob), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// Baixa uma foto já publicada para poder reprocessá-la.
export async function fetchBlob(url) {
  const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
  if (!res.ok) throw new Error('não consegui baixar a foto');
  return await res.blob();
}
