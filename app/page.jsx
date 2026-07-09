import { createClient } from '../lib/supabase-server';
import PortalClient from './PortalClient';

export const revalidate = 60; // ISR: revalida a cada 60s

async function getImoveis() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('imoveis')
    .select('*, imovel_fotos(url, ordem)')
    .eq('status', 'ativo')
    .order('destaque', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function getHero() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['hero_video', 'hero_video_file']);
  const map = {};
  (cfg || []).forEach(r => { map[r.key] = r.value; });
  const heroVideoFile = map.hero_video_file || '';
  if (map.hero_video) return { heroVideo: map.hero_video, heroVideoFile };
  // fallback: vídeo do imóvel em destaque, ou o mais recente que tenha vídeo
  const { data } = await supabase
    .from('imoveis')
    .select('youtube_url, destaque, created_at')
    .eq('status', 'ativo')
    .not('youtube_url', 'is', null)
    .order('destaque', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { heroVideo: data?.youtube_url || '', heroVideoFile };
}

export default async function HomePage() {
  const [imoveis, hero] = await Promise.all([getImoveis(), getHero()]);
  return <PortalClient imoveis={imoveis} heroVideo={hero.heroVideo} heroVideoFile={hero.heroVideoFile} />;
}
