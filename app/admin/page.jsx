import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import GestaoClient from './GestaoClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: imoveis } = await supabase.from('imoveis').select('*, parceiros(nome), imovel_fotos(url, thumb_url, ordem)').order('created_at', { ascending: false });
  const { data: parceiros } = await supabase.from('parceiros').select('*').order('nome');
  const { data: cfg } = await supabase.from('site_config').select('key, value').in('key', ['hero_video', 'hero_video_file', 'zap_email']);
  const cfgMap = {};
  (cfg || []).forEach(r => { cfgMap[r.key] = r.value; });

  // quantos contatos cada imóvel já gerou
  const { data: leadRows } = await supabase.from('leads').select('imovel_id');
  const leadCount = {};
  (leadRows || []).forEach(r => { if (r.imovel_id) leadCount[r.imovel_id] = (leadCount[r.imovel_id] || 0) + 1; });

  return <GestaoClient initialImoveis={imoveis || []} initialParceiros={parceiros || []} initialHero={cfgMap.hero_video || ''} initialHeroFile={cfgMap.hero_video_file || ''} leadCount={leadCount} />;
}
