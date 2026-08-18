-- =====================================================================
-- WEBHOOK DE SAÍDA — avisa seu n8n / CRM quando chega um lead
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

insert into site_config (key, value) values ('lead_webhook_url', '')
on conflict (key) do nothing;
