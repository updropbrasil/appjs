import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase-server';
import LeadsClient from './LeadsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leads', robots: { index: false } };

export default async function LeadsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  const { data: cfg } = await supabase.from('site_config').select('value').eq('key', 'lead_webhook_url').maybeSingle();

  return <LeadsClient initialLeads={leads || []} initialWebhook={cfg?.value || ''} />;
}
