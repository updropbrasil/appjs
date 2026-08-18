-- =====================================================================
-- REGISTRO DE ENVIO DOS LEADS AO N8N
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

-- 'pendente' | 'enviado' | 'falhou' | 'sem_webhook'
alter table leads add column if not exists webhook_status text default 'pendente';
alter table leads add column if not exists webhook_erro text;
alter table leads add column if not exists webhook_enviado_em timestamptz;
alter table leads add column if not exists webhook_tentativas int default 0;

create index if not exists leads_webhook_status_idx on leads (webhook_status);
