import { createClient as criar } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Cliente SÓ para leitura pública (home, página do imóvel).
// Não usa cookies/login: assim o Next guarda a página pronta (ISR) e ela abre
// rápido, em vez de consultar o banco e a sessão a cada visita.
export function createPublicClient() {
  return criar(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

// Número do WhatsApp dos botões do site (Admin → Rastreamento → "WhatsApp dos botões do site").
// Sem valor válido, usa o padrão de lib/config.js.
export async function whatsappDoSite(supabase) {
  try {
    const { data } = await supabase.from('site_config').select('value').eq('key', 'site_whatsapp').maybeSingle();
    const n = String(data?.value || '').replace(/\D/g, '');
    return /^\d{12,13}$/.test(n) ? n : null;
  } catch (e) { return null; }
}
