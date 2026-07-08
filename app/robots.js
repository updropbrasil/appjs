import { SITE_URL } from '../lib/config';

export default function robots() {
  const site = SITE_URL;
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin'] }],
    sitemap: `${site}/sitemap.xml`
  };
}
