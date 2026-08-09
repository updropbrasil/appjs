-- =====================================================================
-- LEADS DO PORTAL (Zap / VivaReal / OLX) + FOTO HORIZONTAL PARA O PORTAL
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

-- Versão horizontal (4:3) de cada foto — usada SÓ no portal.
-- O site continua mostrando a foto original em pé.
alter table imovel_fotos add column if not exists wide_url text;

-- Leads que chegam do portal
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  origin_lead_id  text unique,                    -- id do lead no Grupo OLX (evita duplicidade)
  origem          text,                           -- 'Grupo OLX' | 'MCMV_OLX'
  canal           text,                           -- CLICK_WHATSAPP, CONTACT_CHAT, PHONE_VIEW...
  temperatura     text,                           -- Baixa | Média | Alta
  transacao       text,                           -- RENT | SELL
  nome            text,
  email           text,
  telefone        text,
  mensagem        text,
  codigo_imovel   text,                           -- clientListingId = nosso código (JDA-4821)
  imovel_id       uuid references imoveis(id) on delete set null,
  payload         jsonb,                          -- tudo que o portal mandou
  lido            boolean default false,
  created_at      timestamptz default now()
);

create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_imovel_idx on leads (imovel_id);

alter table leads enable row level security;

-- só quem está logado no admin enxerga os leads
drop policy if exists "leads_admin_read" on leads;
create policy "leads_admin_read" on leads for select
  using (auth.role() = 'authenticated');

drop policy if exists "leads_admin_write" on leads;
create policy "leads_admin_write" on leads for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- o portal grava por aqui (não está logado). Só pode inserir — nunca ler.
drop policy if exists "leads_portal_insert" on leads;
create policy "leads_portal_insert" on leads for insert with check (true);

-- endereço do WhatsApp que recebe o aviso de lead novo (opcional)
insert into site_config (key, value) values ('lead_whatsapp', '')
on conflict (key) do nothing;
