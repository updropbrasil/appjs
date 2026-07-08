# Jason Dias Imóveis — Portal

Portal de imóveis (aluguel e venda) de médio-alto padrão em João Pessoa, com **tour em vídeo** como primeira mídia de cada anúncio. Feito em **Next.js 14 + Supabase**, mobile-first, otimizado para SEO.

- **Site público**: home com vídeo em destaque, filtros (bairro, tipo, faixa de valor, mobília), páginas de detalhe com galeria e WhatsApp.
- **Admin** (`/admin`): login, gestão de imóveis (pausar/reativar/excluir), cadastro passo a passo pelo celular, upload de fotos, parceiros (controle interno), troca do vídeo da home.
- **Vídeos**: YouTube/Shorts (streaming grátis e ilimitado). **Fotos**: Supabase Storage.

---

## 1. Pré-requisitos

- Conta no [Supabase](https://supabase.com) (plano grátis)
- Node 20+ (só para rodar local; o deploy usa Docker)
- Conta no GitHub + Coolify apontando para seu domínio

## 2. Configurar o Supabase

1. No painel do seu projeto → **SQL Editor** → cole e rode o arquivo **`../supabase/schema.sql`** (cria tabelas, RLS, buckets e 2 imóveis de exemplo).
2. **Authentication → Users → Add user**: crie seu login admin (e-mail + senha). Repita para o sócio.
3. As credenciais já estão em `.env.local.example` (URL do projeto + anon key).

> **Segurança**: a `anon key` é pública por natureza — o que protege os dados é o **RLS** (já configurado no schema): o site só lê imóveis `ativo`; parceiros, endereço e edição exigem login.

## 3. Rodar localmente

```bash
cd jasondias-app
cp .env.local.example .env.local     # ajuste NEXT_PUBLIC_SITE_URL e, se tiver, GA/Clarity
npm install
npm run dev                          # http://localhost:3000
```

## 4. Subir no GitHub

```bash
cd jasondias-app
git init
git add .
git commit -m "Portal Jason Dias Imóveis"
git branch -M main
git remote add origin git@github.com:SEU-USUARIO/jasondias-imoveis.git
git push -u origin main
```

## 5. Deploy no Coolify

1. **New Resource → Application → Docker** (o `Dockerfile` já está incluído) apontando para o repositório.
2. **Variáveis de ambiente já vêm embutidas** em `lib/config.js` (Supabase, WhatsApp) — você **não precisa colar nada** no Coolify. A única coisa a ajustar é seu **domínio**: abra `lib/config.js` e troque a linha `SITE_URL` pela URL final do site (usada no sitemap e nos compartilhamentos).
3. Porta do container: **3000**. Aponte seu domínio e ative HTTPS.
4. No Supabase → **Authentication → URL Configuration**, adicione seu domínio em *Site URL* e *Redirect URLs*.

> Se um dia quiser sobrescrever sem mexer no código, pode definir as variáveis `NEXT_PUBLIC_*` no painel do Coolify — elas têm prioridade sobre os valores embutidos.

## 6. Analytics (grátis) — recomendado

- **Microsoft Clarity** (clarity.microsoft.com): cliques, mapas de calor, gravações de sessão, tempo de permanência. Copie o ID e coloque em `NEXT_PUBLIC_CLARITY_ID`.
- **Google Analytics 4**: crie a propriedade, pegue o `G-XXXX` e coloque em `NEXT_PUBLIC_GA_ID`.

- **Analytics (grátis)**: crie as contas do Microsoft Clarity e do Google Analytics 4, pegue os IDs e coloque em `lib/config.js` (`GA_ID` e `CLARITY_ID`) — ou deixe em branco por enquanto.

---

## SEO — o que já vem pronto

- **URLs amigáveis**: `/imovel/apartamento-3q-cabo-branco-joao-pessoa` (slug gerado do título).
- **Títulos na fórmula**: *tipo + quartos + mobília + alugar/vender + bairro*, sempre terminando em **João Pessoa**.
- **Meta tags** e **Open Graph** por imóvel (capa vinda do YouTube ou da foto).
- **Dados estruturados schema.org** (`Product`/`Residence` + `Offer`) — o Google pode exibir o preço direto no resultado.
- **`sitemap.xml`** e **`robots.txt`** gerados automaticamente (todos os imóveis ativos).
- Renderização no servidor (SSR/ISR) — conteúdo indexável, revalida a cada 60s.

## Estrutura

```
jasondias-app/
├── app/
│   ├── layout.jsx            # fonts + GA/Clarity + metadata global
│   ├── page.jsx              # HOME (SSR) → PortalClient
│   ├── PortalClient.jsx      # hero, filtros, grid de cards
│   ├── imovel/[slug]/        # página de detalhe + SEO + schema.org
│   ├── admin/
│   │   ├── login/            # login Supabase
│   │   ├── page.jsx          # gestão (guard de sessão) → GestaoClient
│   │   └── novo/             # cadastro/edição passo a passo + upload
│   ├── sitemap.js / robots.js
├── lib/                      # clientes Supabase + helpers (format, ytId, slug, SEO)
├── supabase/schema.sql       # (na raiz do projeto) schema + RLS + buckets
├── Dockerfile                # para o Coolify
└── .env.local.example
```

## Manutenção rápida

- **Trocar vídeo da home**: admin → card "Vídeo em destaque da home" (marca o imóvel como destaque).
- **Novo bairro/tipo**: os filtros são livres (bairro é texto); tipos ficam em `PortalClient.jsx` e `CadastroClient.jsx` (`CATEGORIAS`).
- **Fotos**: bucket `imoveis-fotos` no Supabase. Vídeos próprios (se um dia precisar): bucket `imoveis-videos`.
