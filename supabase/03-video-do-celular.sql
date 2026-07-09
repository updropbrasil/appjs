-- =====================================================================
-- ATUALIZAÇÃO — vídeo subido do celular (além do YouTube)
-- Rode isto UMA vez no Supabase → SQL Editor.
-- =====================================================================

-- coluna que guarda o link do vídeo enviado do celular
alter table imoveis add column if not exists video_file_url text;

-- bucket público para os vídeos (caso ainda não exista)
insert into storage.buckets (id, name, public)
values ('imoveis-videos', 'imoveis-videos', true)
on conflict (id) do nothing;

-- políticas do bucket: leitura pública, escrita só admin logado
drop policy if exists "videos_read" on storage.objects;
create policy "videos_read" on storage.objects
  for select using (bucket_id = 'imoveis-videos');

drop policy if exists "videos_write" on storage.objects;
create policy "videos_write" on storage.objects
  for insert with check (bucket_id = 'imoveis-videos' and auth.role() = 'authenticated');

drop policy if exists "videos_update" on storage.objects;
create policy "videos_update" on storage.objects
  for update using (bucket_id = 'imoveis-videos' and auth.role() = 'authenticated');
