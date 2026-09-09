// Feed VRSync para o Grupo OLX (Zap Imóveis, VivaReal, OLX).
// Endereço público: https://SEU-DOMINIO/feed/zap.xml
// A sonda do Grupo OLX baixa este arquivo a cada 12 horas.
import { createClient } from '../../../lib/supabase-server';
import { buildZapFeed } from '../../../lib/zap-feed';
import { SITE_URL, WHATSAPP } from '../../../lib/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = createClient();

  const [{ data: imoveis }, { data: cfg }] = await Promise.all([
    supabase
      .from('imoveis')
      .select('*, imovel_fotos(url, wide_url, ordem)')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false })
      .limit(50000),
    supabase.from('site_config').select('key, value')
      .in('key', ['zap_nome', 'zap_email', 'zap_telefone', 'zap_contato']),
  ]);

  const c = {};
  (cfg || []).forEach(r => { c[r.key] = r.value; });

  const tel = WHATSAPP.replace(/^55/, '');
  const contato = {
    nome: c.zap_nome || 'Jason Dias Imóveis',
    email: c.zap_email || '',
    telefone: c.zap_telefone || `(${tel.slice(0, 2)}) ${tel.slice(2)}`,
    contato: c.zap_contato || 'Jason Dias',
    site: SITE_URL,
    logo: `${SITE_URL}/logo-jason-dias.jpg`,
  };

  const xml = buildZapFeed(imoveis || [], contato);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store', // pause/despause reflete na hora na próxima sincronização do portal
    },
  });
}
