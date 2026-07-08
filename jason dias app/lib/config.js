// Configuração central do site.
// Os valores já vêm embutidos aqui (são públicos: a anon key do Supabase é
// feita para ficar exposta — o que protege os dados é o RLS no banco).
// Se quiser sobrescrever, defina as variáveis NEXT_PUBLIC_* no ambiente.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cteahzplamqnjkuxnkva.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0ZWFoenBsYW1xbmprdXhua3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzY4OTMsImV4cCI6MjA5OTExMjg5M30.kLqoEh4DGWYKzDY-Rf7eLpwDu_QFuj6DbUldPNcO5fY';

export const WHATSAPP =
  process.env.NEXT_PUBLIC_WHATSAPP || '5583999282626';

// ⬇️ TROQUE pela URL final do seu site (usada no sitemap e nos compartilhamentos)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://jasondias.com.br';

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || '';
