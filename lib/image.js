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

// Baixa uma foto já publicada para poder reprocessá-la.
export async function fetchBlob(url) {
  const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
  if (!res.ok) throw new Error('não consegui baixar a foto');
  return await res.blob();
}
