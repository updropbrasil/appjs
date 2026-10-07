import './globals.css';
import Script from 'next/script';
import { SITE_URL, GA_ID, CLARITY_ID, MEDIA_ORIGIN, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/config';

// IDs de rastreamento: vêm da tela Admin → Rastreamento (tabela site_config).
// Atualiza sozinho em até 5 minutos, sem precisar de redeploy.
async function idsRastreamento() {
  let cfg = {};
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_config?select=key,value&key=in.(meta_pixel_id,ga_id,clarity_id)`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 300 },
    });
    if (r.ok) (await r.json()).forEach(x => { cfg[x.key] = (x.value || '').trim(); });
  } catch (e) { /* sem rastreamento se o banco não responder */ }
  // só aceita o formato de cada ID (evita injetar qualquer texto no site)
  const pixel = /^\d{6,20}$/.test(cfg.meta_pixel_id || '') ? cfg.meta_pixel_id : '';
  const ga = /^G-[A-Z0-9]{4,20}$/.test(cfg.ga_id || GA_ID) ? (cfg.ga_id || GA_ID) : '';
  const clarity = /^[a-z0-9]{6,20}$/.test(cfg.clarity_id || CLARITY_ID) ? (cfg.clarity_id || CLARITY_ID) : '';
  return { pixel, ga, clarity };
}

const SITE = SITE_URL;

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Imóveis para alugar e comprar em João Pessoa com tour em vídeo | Jason Dias Imóveis',
    template: '%s | Jason Dias Imóveis'
  },
  description:
    'Aluguel e venda de imóveis de médio-alto padrão em João Pessoa. Cada imóvel com tour guiado em vídeo — conheça por dentro antes de visitar.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Jason Dias Imóveis',
    url: SITE
  },
  robots: { index: true, follow: true }
};

export default async function RootLayout({ children }) {
  const { pixel, ga, clarity } = await idsRastreamento();
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {MEDIA_ORIGIN && <link rel="preconnect" href={MEDIA_ORIGIN} crossOrigin="anonymous" />}
        {MEDIA_ORIGIN && <link rel="dns-prefetch" href={MEDIA_ORIGIN} />}
        <link
          href="https://fonts.googleapis.com/css2?family=Marcellus&family=Karla:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}

        {ga ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="init-ga" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga}');
            `}</Script>
          </>
        ) : null}

        {pixel ? (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">{`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixel}');
              fbq('track', 'PageView');
            `}</Script>
            <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${pixel}&ev=PageView&noscript=1`} /></noscript>
          </>
        ) : null}

        {clarity ? (
          <Script id="init-clarity" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");
          `}</Script>
        ) : null}
      </body>
    </html>
  );
}
