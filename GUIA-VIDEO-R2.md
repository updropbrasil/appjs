# Vídeos grandes com autoplay no iPhone — Cloudflare R2 (grátis)

O Supabase (plano atual) limita cada arquivo a **50 MB**. Para os tours rodarem
**sozinhos no iPhone** (como as VSL), o vídeo precisa ser **MP4 nativo** — o
YouTube não autoplaya no iPhone.

Com o R2 configurado, o próprio app sobe o vídeo **direto pro Cloudflare** pelo
mesmo botão de sempre (sem limite de 50 MB). Você faz esta configuração **uma vez**.

Enquanto não configurar, o app continua funcionando: sobe pelo Supabase (≤50 MB)
ou você cola um link .mp4 manualmente.

---

## 1) Criar o bucket

1. Conta em **https://dash.cloudflare.com** (grátis).
2. Menu lateral → **R2** → **Create bucket**. Nome: `jasondias-videos` → Create.

## 2) Deixar o bucket público (para o site exibir o vídeo)

1. Abra o bucket → **Settings** → **Public access**.
2. Em **R2.dev subdomain** → **Allow Access**. Vai aparecer uma URL tipo
   `https://pub-xxxxxxxxxxxx.r2.dev` → **copie** (é o `publicBase`).
   *(Opcional para produção: ligar um domínio seu em "Custom Domains", ex.
   `videos.jasondias.com.br`.)*

## 3) Liberar o upload pelo site (CORS)

1. No bucket → **Settings** → role até **CORS Policy** → **Add CORS policy**.
2. Cole isto (troque pelos seus domínios) e salve:

```json
[
  {
    "AllowedOrigins": [
      "https://jasondias.com.br",
      "https://www.jasondias.com.br",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## 4) Criar o token de acesso (as "chaves")

1. Em **R2** → **Manage R2 API Tokens** → **Create API Token**.
2. Permissão: **Object Read & Write**. Bucket: pode deixar "todos" ou só o
   `jasondias-videos`. Create.
3. Anote os 3 valores que aparecem:
   - **Account ID** (também aparece na página inicial do R2)
   - **Access Key ID**
   - **Secret Access Key** (só aparece UMA vez — copie agora)

## 5) Colar os valores no app

Abra o arquivo **`lib/r2-config.server.js`** e preencha:

```js
export const R2 = {
  accountId:       '...seu Account ID...',
  accessKeyId:     '...seu Access Key ID...',
  secretAccessKey: '...seu Secret Access Key...',
  bucket:          'jasondias-videos',
  publicBase:      'https://pub-xxxxxxxxxxxx.r2.dev',
};
```

Salve, suba a pasta no GitHub, Coolify reconstrói. Pronto.

> ⚠️ Essas chaves são secretas. Mantenha o repositório do GitHub **privado**.

---

## Como usar no dia a dia

- **Imóvel:** cadastrar/editar → aba **"Vídeo automático"** → **OPÇÃO B — Subir
  do celular**. Com o R2 configurado, sobe sem limite e aparece a % de envio.
- **Vídeo da home:** Admin → "Vídeo em destaque da home" → OPÇÃO 2 → subir.
- Também dá pra **colar um link .mp4** (OPÇÃO A) se você já subiu o arquivo à mão.

## Dicas de vídeo
- Exporte em **MP4 (H.264)**, vertical **1080×1920** para os cards.
- Deixe **curto (30–60s)** — carrega rápido e converte melhor.
- R2: 10 GB grátis + **sem cobrança de tráfego** (ótimo para site com visitas).
