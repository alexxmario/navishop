import { useEffect } from 'react';

const SITE_URL = 'https://navi.piloton.ro';
const DEFAULT_TITLE = 'PilotOn – Navigații Auto cu Android, CarPlay și Android Auto';
const DEFAULT_DESCRIPTION =
  'Navigații auto PilotOn cu Android pentru toate mărcile de mașini: CarPlay și Android Auto wireless, montaj Plug & Play, livrare rapidă în toată România.';
const DEFAULT_IMAGE = `${SITE_URL}/logo512.png`;

const upsertMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

/**
 * Setează title, meta description, canonical, Open Graph/Twitter și JSON-LD
 * pentru pagina curentă. Folosește seoTitle/seoDescription din admin când există.
 */
const Seo = ({ title, description, path, image, jsonLd }) => {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    const fullTitle = title || DEFAULT_TITLE;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${path || ''}`;
    const img = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertLink('canonical', url);

    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:type', path && path.startsWith('/product/') ? 'product' : 'website');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);

    let script = document.getElementById('seo-jsonld');
    if (jsonLdString) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'seo-jsonld';
        document.head.appendChild(script);
      }
      script.textContent = jsonLdString;
    } else if (script) {
      script.remove();
    }

    return () => {
      const s = document.getElementById('seo-jsonld');
      if (s) s.remove();
    };
  }, [title, description, path, image, jsonLdString]);

  return null;
};

export { SITE_URL, DEFAULT_TITLE, DEFAULT_DESCRIPTION };
export default Seo;
