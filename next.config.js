/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache no navegador para arquivos fixos da pasta public (o padrão do Next é max-age=0)
  async headers() {
    return [
      { source: '/fonts/:arquivo*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/logo-jason-dias.jpg', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'cteahzplamqnjkuxnkva.supabase.co' },
      { protocol: 'https', hostname: 'lqsklpuydvaowygxpwzc.supabase.co' } // fotos dos imóveis da parceria com a Jassiara
    ]
  }
};
module.exports = nextConfig;
