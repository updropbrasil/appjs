import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';

// Layout do admin: bloqueia acesso se não houver sessão (além do RLS no banco).
export default async function AdminLayout({ children }) {
  return children; // guard real fica em cada page via getUser (abaixo)
}
