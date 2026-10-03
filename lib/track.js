'use client';
// Eventos de rastreamento (Meta Pixel, Google Analytics e Clarity).
// Os scripts carregam depois da página; por isso tentamos por alguns segundos.
function quando(teste, fn, tentativas = 20) {
  if (typeof window === 'undefined') return;
  if (teste()) { try { fn(); } catch (e) {} return; }
  if (tentativas > 0) setTimeout(() => quando(teste, fn, tentativas - 1), 300);
}

export function trackViewImovel(im) {
  const id = im?.codigo || im?.id;
  if (!id) return;
  const valor = im?.preco_cents ? im.preco_cents / 100 : undefined;
  quando(() => window.fbq, () => window.fbq('track', 'ViewContent', {
    content_ids: [String(id)], content_type: 'home_listing', content_name: im.titulo || '',
    ...(valor ? { value: valor, currency: 'BRL' } : {}),
  }));
  quando(() => window.gtag, () => window.gtag('event', 'view_item', { items: [{ item_id: String(id), item_name: im.titulo || '' }] }));
}

export function trackWhatsApp(im) {
  const id = im?.codigo || im?.id;
  quando(() => window.fbq, () => window.fbq('track', 'Contact', { content_ids: id ? [String(id)] : [], content_type: 'home_listing' }), 0);
  quando(() => window.gtag, () => window.gtag('event', 'generate_lead', { item_id: id ? String(id) : undefined, method: 'whatsapp' }), 0);
  quando(() => window.clarity, () => window.clarity('event', 'clique_whatsapp'), 0);
}
