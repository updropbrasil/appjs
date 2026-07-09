-- =====================================================================
-- ATUALIZAÇÃO — tabela do "Vídeo em destaque da home"
-- Rode isto UMA vez no Supabase → SQL Editor (além do schema.sql).
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
