-- =====================================================================
-- LEADS — colunas de registro do envio ao n8n + permissão de gravação
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- É este SQL que faz o lead aparecer no admin.
-- =====================================================================

alter table leads add column if not exists webhook_status text default 'pendente';
alter table leads add column if not exists webhook_erro text;
alter table leads add column if not exists webhook_enviado_em timestamptz;
alter table leads add column if not exists webhook_tentativas int default 0;

create index if not exists leads_webhook_status_idx on leads (webhook_status);

-- o portal grava sem estar logado: precisa poder inserir E atualizar
-- (atualizar é necessário porque o mesmo lead pode chegar mais de uma vez)
drop policy if exists "leads_portal_insert" on leads;
create policy "leads_portal_insert" on leads for insert with check (true);

drop policy if exists "leads_portal_update" on leads;
create policy "leads_portal_update" on leads for update using (true) with check (true);
