-- =====================================================================
-- CAMPOS OPERACIONAIS DO IMÓVEL (para o atendimento / IA)
-- Rode UMA vez no Supabase → SQL Editor. Seguro rodar novamente.
-- =====================================================================

-- o que o condomínio inclui (texto livre: água, gás, internet, portaria…)
alter table imoveis add column if not exists condominio_inclui text;

-- água e gás: 'incluso' | 'individual' | 'nao_informado'
alter table imoveis add column if not exists agua_tipo text default 'nao_informado';
alter table imoveis add column if not exists gas_tipo  text default 'nao_informado';

-- captação: 'propria' | 'parceiro'
alter table imoveis add column if not exists captacao text default 'propria';

-- corretor parceiro (nome + WhatsApp) — interno, não vai para o site nem portais
alter table imoveis add column if not exists parceiro_nome text;
alter table imoveis add column if not exists parceiro_whatsapp text;
