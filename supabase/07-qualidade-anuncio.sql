-- =====================================================================
-- QUALIDADE DO ANÚNCIO NOS PORTAIS (ranqueamento Zap/VivaReal/OLX)
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

-- endereço completo: melhora posicionamento e busca por mapa no portal
-- (enviamos o dado, mas o portal exibe só o bairro — o cliente não vê a rua)
alter table imoveis add column if not exists numero text;
alter table imoveis add column if not exists complemento text;

-- características do imóvel (piscina, academia, varanda gourmet...)
alter table imoveis add column if not exists features jsonb default '[]'::jsonb;

-- ano de construção (conta como completude do anúncio)
alter table imoveis add column if not exists ano_construcao int;
