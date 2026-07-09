import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import GestaoClient from './GestaoClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: imoveis } = await supabase.from('imoveis').select('*, parceiros(nome)').order('created_at', { ascending: false });
  const { data: parceiros } = await supabase.from('parceiros').select('*').order('nome');
  const { data: cfg } = await supabase.from('site_config').select('value').eq('key', 'hero_video').maybeSingle();

  return <GestaoClient initialImoveis={imoveis || []} initialParceiros={parceiros || []} initialHero={cfg?.value || ''} />;
}
