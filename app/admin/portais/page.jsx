import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase-server';
import PortaisClient from './PortaisClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portais', robots: { index: false } };

export default async function PortaisPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('*, imovel_fotos(url, ordem)')
    .order('created_at', { ascending: false });

  const { data: cfg } = await supabase.from('site_config').select('key, value')
    .in('key', ['zap_email', 'zap_nome', 'zap_telefone']);
  const c = {};
  (cfg || []).forEach(r => { c[r.key] = r.value; });

  return <PortaisClient initialImoveis={imoveis || []} initialEmail={c.zap_email || ''} />;
}
