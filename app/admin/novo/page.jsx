import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase-server';
import CadastroClient from './CadastroClient';

export const dynamic = 'force-dynamic';

export default async function NovoPage({ searchParams }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: parceiros } = await supabase.from('parceiros').select('*').order('nome');

  let imovel = null, fotos = [];
  if (searchParams?.id) {
    const { data } = await supabase.from('imoveis').select('*').eq('id', searchParams.id).maybeSingle();
    imovel = data;
    if (data) {
      const { data: f } = await supabase.from('imovel_fotos').select('*').eq('imovel_id', data.id).order('ordem');
      fotos = f || [];
    }
  }

  return <CadastroClient parceiros={parceiros || []} imovel={imovel} fotosIniciais={fotos} />;
}
