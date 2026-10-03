import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase-server';
import RastreamentoClient from './RastreamentoClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rastreamento', robots: { index: false } };

export default async function RastreamentoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data } = await supabase.from('site_config').select('key, value').in('key', ['meta_pixel_id', 'ga_id', 'clarity_id']);
  const c = {};
  (data || []).forEach(r => { c[r.key] = r.value || ''; });
  return <RastreamentoClient inicial={c} />;
}
