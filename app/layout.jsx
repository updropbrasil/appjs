import './globals.css';
import Script from 'next/script';
import { SITE_URL, GA_ID, CLARITY_ID } from '../lib/config';

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

export default function RootLayout({ children }) {
  const ga = GA_ID;
  const clarity = CLARITY_ID;
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
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
            <Script id="ga" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga}');
            `}</Script>
          </>
        ) : null}

        {clarity ? (
          <Script id="clarity" strategy="afterInteractive">{`
            (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");
          `}</Script>
        ) : null}
      </body>
    </html>
  );
}
