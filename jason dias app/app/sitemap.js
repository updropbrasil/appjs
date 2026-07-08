import { createClient } from '../lib/supabase-server';
import { SITE_URL } from '../lib/config';

export const revalidate = 3600;

export default async function sitemap() {
  const site = SITE_URL;
  const supabase = createClient();
  const { data } = await supabase.from('imoveis').select('slug, updated_at').eq('status', 'ativo');
  const imoveis = (data || []).map(i => ({
    url: `${site}/imovel/${i.slug}`,
    lastModified: i.updated_at ? new Date(i.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8
  }));
  return [
    { url: site, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...imoveis
  ];
}
