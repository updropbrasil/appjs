-- =====================================================================
-- Portal Jason Dias Imóveis — Schema Supabase
-- Aplique no Supabase → SQL Editor → New query → cole tudo → Run
-- =====================================================================

-- ---------- EXTENSÕES ----------
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type finalidade_tp as enum ('aluguel', 'venda');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mobilia_tp as enum ('mobiliado', 'semi', 'sem', 'planejados');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_tp as enum ('ativo', 'pausado');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- PARCEIROS  (controle interno — nunca exposto no site)
-- =====================================================================
create table if not exists parceiros (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  comissao_pct numeric(5,2) default 0,          -- % padrão da parceria
  observacoes  text,
  created_at   timestamptz default now()
);

-- =====================================================================
-- IMÓVEIS
-- =====================================================================
create table if not exists imoveis (
  id            uuid primary key default gen_random_uuid(),

  -- identificação / SEO
  titulo        text not null,
  slug          text unique not null,           -- ex.: apartamento-3q-cabo-branco-joao-pessoa
  descricao     text,

  -- classificação (alimenta os filtros do site)
  finalidade    finalidade_tp not null,         -- aluguel | venda
  categoria     text not null,                  -- Apartamento, Casa, Cobertura, Flat, Comercial
  mobilia       mobilia_tp not null default 'sem',

  -- localização
  bairro        text not null,                  -- PÚBLICO (essencial p/ busca e SEO)
  cidade        text not null default 'João Pessoa',
  estado        text not null default 'PB',
  referencia    text,                           -- PÚBLICO: "a 200 m da praia de Tambaú"
  endereco      text,                           -- PRIVADO: rua/número (nunca vai ao site)

  -- características
  quartos       int  default 0,
  suites        int  default 0,
  banheiros     int  default 0,
  vagas         int  default 0,
  area_m2       numeric(8,2),

  -- valores (em centavos p/ evitar erro de float)
  preco_cents         bigint not null default 0,
  condominio_cents    bigint default 0,
  iptu_cents          bigint default 0,

  -- mídia
  youtube_url   text,                           -- link do vídeo/Shorts (streaming grátis)
  video_id      text,                           -- id extraído do YouTube (capa/embed)
  capa_url      text,                           -- foto de capa (fallback do storage)

  -- parceria (controle interno)
  parceiro_id   uuid references parceiros(id) on delete set null,
  parceiro_pct  numeric(5,2),                   -- % específico deste imóvel (sobrepõe o padrão)

  -- publicação
  status        status_tp not null default 'ativo',
  destaque      boolean default false,          -- aparece no hero/"chegaram esta semana"
  ordem         int default 0,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- FOTOS do imóvel (galeria — ficam no bucket 'imoveis-fotos')
create table if not exists imovel_fotos (
  id         uuid primary key default gen_random_uuid(),
  imovel_id  uuid not null references imoveis(id) on delete cascade,
  path       text not null,                     -- caminho no storage
  url        text not null,                     -- public URL
  ordem      int default 0,
  created_at timestamptz default now()
);

-- LEADS (opcional: registrar quem clicou no WhatsApp)
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  imovel_id  uuid references imoveis(id) on delete set null,
  origem     text default 'whatsapp',
  created_at timestamptz default now()
);

-- ---------- ÍNDICES (busca e filtros rápidos) ----------
create index if not exists idx_imoveis_status      on imoveis(status);
create index if not exists idx_imoveis_finalidade  on imoveis(finalidade);
create index if not exists idx_imoveis_bairro      on imoveis(bairro);
create index if not exists idx_imoveis_categoria   on imoveis(categoria);
create index if not exists idx_imoveis_mobilia     on imoveis(mobilia);
create index if not exists idx_imoveis_preco       on imoveis(preco_cents);
create index if not exists idx_imoveis_slug        on imoveis(slug);
create index if not exists idx_fotos_imovel        on imovel_fotos(imovel_id);

-- ---------- updated_at automático ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

drop trigger if exists trg_imoveis_updated on imoveis;
create trigger trg_imoveis_updated before update on imoveis
  for each row execute function set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
--   - Site público: SÓ LÊ imóveis com status 'ativo'
--   - Admin logado: faz tudo
--   - parceiros / leads: só admin logado
-- =====================================================================
alter table imoveis      enable row level security;
alter table imovel_fotos enable row level security;
alter table parceiros    enable row level security;
alter table leads        enable row level security;

-- IMÓVEIS: leitura pública apenas dos ativos
drop policy if exists "imoveis_public_read" on imoveis;
create policy "imoveis_public_read" on imoveis
  for select using (status = 'ativo');

-- IMÓVEIS: admin (qualquer usuário autenticado) faz tudo
drop policy if exists "imoveis_admin_all" on imoveis;
create policy "imoveis_admin_all" on imoveis
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- FOTOS: leitura pública, escrita só admin
drop policy if exists "fotos_public_read" on imovel_fotos;
create policy "fotos_public_read" on imovel_fotos
  for select using (true);
drop policy if exists "fotos_admin_all" on imovel_fotos;
create policy "fotos_admin_all" on imovel_fotos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- PARCEIROS: só admin (nada público)
drop policy if exists "parceiros_admin_all" on parceiros;
create policy "parceiros_admin_all" on parceiros
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- LEADS: qualquer um pode inserir (registrar clique), só admin lê
drop policy if exists "leads_insert_any" on leads;
create policy "leads_insert_any" on leads
  for insert with check (true);
drop policy if exists "leads_admin_read" on leads;
create policy "leads_admin_read" on leads
  for select using (auth.role() = 'authenticated');

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('imoveis-fotos', 'imoveis-fotos', true)
on conflict (id) do nothing;

-- (opcional) bucket para vídeos subidos direto do celular.
-- Recomendado usar YouTube/Shorts; use este só se precisar hospedar vídeo próprio.
insert into storage.buckets (id, name, public)
values ('imoveis-videos', 'imoveis-videos', true)
on conflict (id) do nothing;

-- Políticas de storage: leitura pública, escrita só admin logado
drop policy if exists "fotos_read"   on storage.objects;
create policy "fotos_read" on storage.objects
  for select using (bucket_id in ('imoveis-fotos','imoveis-videos'));

drop policy if exists "fotos_write"  on storage.objects;
create policy "fotos_write" on storage.objects
  for insert with check (bucket_id in ('imoveis-fotos','imoveis-videos') and auth.role() = 'authenticated');

drop policy if exists "fotos_update" on storage.objects;
create policy "fotos_update" on storage.objects
  for update using (bucket_id in ('imoveis-fotos','imoveis-videos') and auth.role() = 'authenticated');

drop policy if exists "fotos_delete" on storage.objects;
create policy "fotos_delete" on storage.objects
  for delete using (bucket_id in ('imoveis-fotos','imoveis-videos') and auth.role() = 'authenticated');

-- =====================================================================
-- CONFIG DO SITE (chave/valor) — ex.: vídeo em destaque da home
-- =====================================================================
create table if not exists site_config (
  key   text primary key,
  value text
);
alter table site_config enable row level security;

drop policy if exists "config_public_read" on site_config;
create policy "config_public_read" on site_config
  for select using (true);

drop policy if exists "config_admin_write" on site_config;
create policy "config_admin_write" on site_config
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into site_config (key, value) values ('hero_video', '')
on conflict (key) do nothing;

-- =====================================================================
-- DADOS DE EXEMPLO (opcional — apague depois de testar)
-- =====================================================================
insert into imoveis (titulo, slug, finalidade, categoria, mobilia, bairro, referencia,
                     quartos, suites, banheiros, vagas, area_m2, preco_cents, youtube_url, destaque)
values
('Apartamento vista-mar 3 quartos mobiliado para alugar no Cabo Branco, em João Pessoa',
 'apartamento-vista-mar-3q-cabo-branco-joao-pessoa', 'aluguel', 'Apartamento', 'mobiliado',
 'Cabo Branco', 'De frente para a praia do Cabo Branco', 3, 3, 4, 2, 148, 650000, null, true),
('Casa em condomínio 4 suítes com planejados à venda no Altiplano, em João Pessoa',
 'casa-condominio-4-suites-altiplano-joao-pessoa', 'venda', 'Casa', 'planejados',
 'Altiplano', 'Condomínio fechado a 5 min do Cabo Branco', 4, 4, 5, 4, 320, 129000000, null, false)
on conflict (slug) do nothing;

-- =====================================================================
-- PRONTO. Próximo passo: criar o usuário admin em
-- Authentication → Users → Add user (e-mail + senha).
-- =====================================================================
