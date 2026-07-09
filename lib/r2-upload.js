// Upload de vídeo direto pro Cloudflare R2 (via URL assinada do servidor).
// Retorna a URL pública do vídeo, ou null se o R2 não estiver configurado
// (nesse caso o chamador faz o fallback pro Supabase, limite de 50 MB).
export async function uploadToR2(file, onProgress) {
  const res = await fetch('/api/r2-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name }),
  });
  if (res.status === 501) return null; // R2 não configurado
  if (!res.ok) throw new Error('Não consegui preparar o upload no R2.');
  const { uploadUrl, publicUrl } = await res.json();

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve()
      : reject(new Error('Falha no upload (HTTP ' + xhr.status + ')'));
    xhr.onerror = () => reject(new Error('Erro de rede/CORS no upload. Confira o CORS do bucket R2.'));
    xhr.send(file);
  });

  return publicUrl;
}
