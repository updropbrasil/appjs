-- =====================================================================
-- CONTATO INTERNO DO IMÓVEL (proprietário / corretor parceiro)
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- Só aparece no admin: não vai para o site nem para os portais.
-- =====================================================================

alter table imoveis add column if not exists contato_interno text;
