// Endereço oficial de recebimento de leads do Grupo OLX:
//   https://jasondias.com.br/grupozap/lead
import { receberLead } from '../../../lib/lead-intake';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  return receberLead(req);
}

// o validador de endpoint do Grupo OLX confere se a URL responde
export async function GET() {
  return new Response('ok', { status: 200 });
}
