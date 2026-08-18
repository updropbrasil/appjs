import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import GestaoClient from './GestaoClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  // tudo de uma vez — em fila, cada consulta esperava a anterior
  const [rImoveis, rParceiros, rCfg, rLeads] = await Promise.all([
    supabase.from('imoveis').select('*, parceiros(nome), imovel_fotos(url, thumb_url, ordem)').order('created_at', { ascending: false }),
    supabase.from('parceiros').select('*').order('nome'),
    supabase.from('site_config').select('key, value').in('key', ['hero_video', 'hero_video_file', 'zap_email']),
    supabase.from('leads').select('imovel_id'),
  ]);

  const cfgMap = {};
  (rCfg.data || []).forEach(r => { cfgMap[r.key] = r.value; });

  const leadCount = {};
  (rLeads.data || []).forEach(r => { if (r.imovel_id) leadCount[r.imovel_id] = (leadCount[r.imovel_id] || 0) + 1; });

  return (
    <GestaoClient
      initialImoveis={rImoveis.data || []}
      initialParceiros={rParceiros.data || []}
      initialHero={cfgMap.hero_video || ''}
      initialHeroFile={cfgMap.hero_video_file || ''}
      leadCount={leadCount}
    />
  );
}
