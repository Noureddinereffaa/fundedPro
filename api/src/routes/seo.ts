import { Router } from 'express'

const router = Router()

const SITE_URL = 'https://profundx.com'

const LANGUAGES = ['en', 'ar', 'fr', 'es', 'id']

const PAGE_ROUTES = [
  '', 'login', 'register', 'forgot-password', 'pricing', 'contact',
  'about', 'faq', 'terms', 'privacy', 'leaderboard',
]

const STATIC_PATHS = [
  { loc: '', priority: '1.0', changefreq: 'weekly' },
  { loc: 'login', priority: '0.5', changefreq: 'monthly' },
  { loc: 'register', priority: '0.9', changefreq: 'monthly' },
  { loc: 'pricing', priority: '0.8', changefreq: 'weekly' },
  { loc: 'contact', priority: '0.4', changefreq: 'yearly' },
  { loc: 'about', priority: '0.5', changefreq: 'yearly' },
  { loc: 'faq', priority: '0.6', changefreq: 'monthly' },
  { loc: 'terms', priority: '0.3', changefreq: 'yearly' },
  { loc: 'privacy', priority: '0.3', changefreq: 'yearly' },
  { loc: 'leaderboard', priority: '0.6', changefreq: 'daily' },
]

router.get('/sitemap.xml', async (_req, res) => {
  const urls = LANGUAGES.flatMap((lang) =>
    STATIC_PATHS.map(
      (p) => `  <url>
    <loc>${SITE_URL}/${lang}/${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
    ),
  ).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`

  res.header('Content-Type', 'application/xml')
  res.send(xml)
})

router.get('/robots.txt', (_req, res) => {
  const txt = `User-agent: *
Allow: /
Disallow: /en/admin/
Disallow: /ar/admin/
Disallow: /fr/admin/
Disallow: /es/admin/
Disallow: /id/admin/

Sitemap: ${SITE_URL}/sitemap.xml
`
  res.header('Content-Type', 'text/plain')
  res.send(txt)
})

export default router
