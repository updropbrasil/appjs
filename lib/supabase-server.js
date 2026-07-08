import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Cliente para Server Components / rotas. Leitura pública é feita com a anon key
// e protegida pelas policies de RLS (só imóveis 'ativo' são retornados ao público).
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch (e) { /* chamado de Server Component — ignorável */ }
        }
      }
    }
  );
}
