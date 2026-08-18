import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase-server';
import LeadsClient from './LeadsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leads', robots: { index: false } };

export default async function LeadsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const [rLeads, rCfg, rUm] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('site_config').select('value').eq('key', 'lead_webhook_url').maybeSingle(),
    supabase.from('imoveis').select('codigo').not('codigo', 'is', null).limit(1).maybeSingle(),
  ]);

  return (
    <LeadsClient
      initialLeads={rLeads.data || []}
      initialWebhook={rCfg.data?.value || ''}
      codigoExemplo={rUm.data?.codigo || 'JDA-0000'}
    />
  );
}
