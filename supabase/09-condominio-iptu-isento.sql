-- =====================================================================
-- CONDOMÍNIO / IPTU: isento ou não informado
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

-- 'valor' (usa o valor em centavos) | 'isento' | 'nao_informado'
alter table imoveis add column if not exists condominio_tipo text default 'valor';
alter table imoveis add column if not exists iptu_tipo text default 'valor';
