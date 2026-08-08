-- =====================================================================
-- INTEGRAÇÃO PORTAL ZAP / VIVAREAL (Grupo OLX) — feed VRSync
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

-- CEP é exigido pelo Grupo OLX em todos os anúncios
alter table imoveis add column if not exists cep text;

-- controle de quais imóveis vão para os portais e com qual destaque
alter table imoveis add column if not exists zap_ativo boolean default true;
alter table imoveis add column if not exists zap_destaque text default 'STANDARD';

-- dados da imobiliária usados no feed (cabeçalho e contato dos anúncios)
insert into site_config (key, value) values
  ('zap_nome',      'Jason Dias Imóveis'),
  ('zap_email',     ''),
  ('zap_telefone',  '(83) 99928-2626'),
  ('zap_contato',   'Jason Dias')
on conflict (key) do nothing;
