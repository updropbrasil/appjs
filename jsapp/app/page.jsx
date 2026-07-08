import { createClient } from '../lib/supabase-server';
import PortalClient from './PortalClient';

export const revalidate = 60; // ISR: revalida a cada 60s

async function getImoveis() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .eq('status', 'ativo')
    .order('destaque', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function getHero() {
  const supabase = createClient();
  const { data } = await supabase
    .from('imoveis')
    .select('youtube_url')
    .eq('status', 'ativo')
    .eq('destaque', true)
    .not('youtube_url', 'is', null)
    .limit(1)
    .maybeSingle();
  return data?.youtube_url || '';
}

export default async function HomePage() {
  const [imoveis, heroVideo] = await Promise.all([getImoveis(), getHero()]);
  return <PortalClient imoveis={imoveis} heroVideo={heroVideo} />;
}
