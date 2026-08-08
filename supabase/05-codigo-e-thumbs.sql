-- =====================================================================
-- ATUALIZAÇÃO — código do imóvel + miniatura das fotos (carregamento rápido)
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

-- código interno do imóvel (ex.: JD-1042) — usado no site e no WhatsApp
alter table imoveis add column if not exists codigo text;
create unique index if not exists imoveis_codigo_uniq on imoveis (codigo) where codigo is not null;

-- miniatura leve de cada foto: aparece instantaneamente e depois entra a grande
alter table imovel_fotos add column if not exists thumb_url text;
