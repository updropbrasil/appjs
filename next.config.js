/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'cteahzplamqnjkuxnkva.supabase.co' },
      { protocol: 'https', hostname: 'lqsklpuydvaowygxpwzc.supabase.co' } // fotos dos imóveis da parceria com a Jassiara
    ]
  }
};
module.exports = nextConfig;
