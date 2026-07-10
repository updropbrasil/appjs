// ============================================================
// CREDENCIAIS DO CLOUDFLARE R2  ·  ARQUIVO SERVIDOR (nunca vai pro navegador)
// ------------------------------------------------------------
// Preencha os 4 valores abaixo UMA vez para o app subir os vídeos
// direto pro Cloudflare (sem limite de 50 MB, autoplay no iPhone).
//
// ⚠️ São chaves SECRETAS. Mantenha o repositório do GitHub PRIVADO.
// Se deixar em branco, o app continua funcionando e cai no upload
// do Supabase (limite de 50 MB) automaticamente.
//
// Onde pegar cada valor está no arquivo GUIA-VIDEO-R2.md.
// ============================================================

export const R2 = {
  // Cloudflare → R2 → "Manage R2 API Tokens" → cria um token e copia:
  accountId:       process.env.R2_ACCOUNT_ID       || '560d32a44fbbaa92d4cf9ca0bb68373d',   // Account ID
  accessKeyId:     process.env.R2_ACCESS_KEY_ID     || 'c772edc388d8f27be45c57a9fca359b0',   // Access Key ID do token
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '4d5cce7458f29c370cbeedfda21db5ee73ddd9f214ef74308b055b9d55c6c81e',   // Secret Access Key do token

  bucket:          process.env.R2_BUCKET            || 'jasondias-videos',

  // URL pública do bucket (aba Settings → Public access → r2.dev,
  // ou seu domínio). SEM barra no final. Ex.: https://pub-xxxx.r2.dev
  publicBase:      process.env.R2_PUBLIC_BASE       || 'https://pub-8e2cb656649243e49a2cdd3f4ca94d4c.r2.dev',
};

export const r2Configured = () =>
  !!(R2.accountId && R2.accessKeyId && R2.secretAccessKey && R2.publicBase);
