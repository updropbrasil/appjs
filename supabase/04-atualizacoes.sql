-- =====================================================================
-- ATUALIZAÇÕES (rode UMA vez no Supabase → SQL Editor).
-- É seguro rodar mesmo que você já tenha rodado partes antes.
-- Cobre: vídeo do celular, vídeo da home nativo, e campo "andar".
-- =====================================================================

-- colunas novas
alter table imoveis add column if not exists video_file_url text;  -- vídeo subido do celular
alter table imoveis add column if not exists andar text;           -- andar do apartamento

-- config do site (vídeo da home por link e/ou arquivo)
create table if not exists site_config ( key text primary key, value text );
alter table site_config enable row level security;
drop policy if exists "config_public_read" on site_config;
create policy "config_public_read" on site_config for select using (true);
drop policy if exists "config_admin_write" on site_config;
create policy "config_admin_write" on site_config for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
insert into site_config (key, value) values ('hero_video',''), ('hero_video_file','')
on conflict (key) do nothing;

-- bucket dos vídeos
insert into storage.buckets (id, name, public)
values ('imoveis-videos', 'imoveis-videos', true)
on conflict (id) do nothing;

drop policy if exists "videos_read" on storage.objects;
create policy "videos_read" on storage.objects
  for select using (bucket_id = 'imoveis-videos');
drop policy if exists "videos_write" on storage.objects;
create policy "videos_write" on storage.objects
  for insert with check (bucket_id = 'imoveis-videos' and auth.role() = 'authenticated');
drop policy if exists "videos_update" on storage.objects;
create policy "videos_update" on storage.objects
  for update using (bucket_id = 'imoveis-videos' and auth.role() = 'authenticated');

-- garante o bucket das fotos também
insert into storage.buckets (id, name, public)
values ('imoveis-fotos', 'imoveis-fotos', true)
on conflict (id) do nothing;
