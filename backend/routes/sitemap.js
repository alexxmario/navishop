const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

const SITE_URL = process.env.SITE_URL || 'https://navi.piloton.ro';

const STATIC_PATHS = ['/', '/contact', '/reduceri', '/b2b', '/termeni', '/confidentialitate', '/cookies'];
const CATEGORIES = [
  'navigatii-gps',
  'carplay-android',
  'camere-marsarier',
  'accesorii',
  'module-carplay',
  'portbagaj-electric',
  'lumini-ambientale'
];

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache = { xml: null, at: 0 };

const urlTag = (loc, lastmod) =>
  `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;

router.get('/sitemap.xml', async (req, res) => {
  try {
    if (!cache.xml || Date.now() - cache.at > CACHE_TTL_MS) {
      const products = await Product.find({ status: 'active' })
        .select('slug updatedAt')
        .lean();

      const lines = [];
      STATIC_PATHS.forEach(p => lines.push(urlTag(`${SITE_URL}${p}`)));
      CATEGORIES.forEach(c => lines.push(urlTag(`${SITE_URL}/category/${c}`)));
      products.forEach(p => {
        if (!p.slug) return;
        const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : null;
        lines.push(urlTag(`${SITE_URL}/product/${encodeURI(p.slug)}`, lastmod));
      });

      cache = {
        xml: '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          lines.join('\n') +
          '\n</urlset>',
        at: Date.now()
      };
    }

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(cache.xml);
  } catch (error) {
    res.status(500).json({ message: 'Error generating sitemap', error: error.message });
  }
});

module.exports = router;
