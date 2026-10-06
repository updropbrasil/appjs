import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/config';

// Mantém a sessão do Supabase válida (refresh de cookies) em todas as rotas.
export async function middleware(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Só o painel e as rotas de API precisam renovar o login. As páginas públicas
  // (home e imóveis) ficam sem essa consulta e podem sair prontas do cache.
  matcher: ['/admin/:path*', '/api/:path*']
};
