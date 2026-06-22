import { extractBrandModelInfo } from './carModel';

// Boilerplate strings that exist in the DB but carry no real information.
const JUNK_DESCRIPTION = /va\s+multumim|multumim\s+ca\s+ati\s+ales/i;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

const niceInch = (value) => clean(value).replace(/\s*inch/i, '″').replace(/\s+/g, ' ').trim();

const has = (haystack, ...needles) =>
  needles.some((n) => haystack.includes(n));

// Returns true when the product carries a real, human-written description
// rather than the "Va multumim..." boilerplate or an empty string.
export const hasRealDescription = (description) => {
  const text = clean(description);
  return text.length >= 60 && !JUNK_DESCRIPTION.test(text);
};

// Pulls meaningful, non-emoji sections out of a saved structuredDescription.
export const getManualSections = (product) => {
  const sections = product?.structuredDescription?.sections;
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section) => ({
      title: clean(section.title).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, '').trim(),
      points: (section.points || []).map(clean).filter(Boolean),
    }))
    .filter((section) => section.title && section.points.length > 0);
};

// Builds the spec-story description entirely from data that already exists on
// the product: the car brand/model/years in the name + romanianSpecs + images.
export const buildGeneratedDescription = (product) => {
  if (!product) return null;

  const specs = product.romanianSpecs || {};
  const hw = specs.hardware || {};
  const display = specs.display || {};
  const conn = specs.connectivity || {};
  const features = specs.features || {};
  const compat = specs.compatibility || {};
  const general = specs.general || {};

  const { brandLabel, modelLabel } = extractBrandModelInfo(product.name || '');

  const carName = [brandLabel, modelLabel].filter(Boolean).join(' ').trim();
  const headline = carName || clean(product.name).replace(/^Navigatie\s+PilotOn\s+/i, '') || clean(product.name);

  // Lowercased haystack used for capability detection.
  const haystack = [
    product.name,
    features.functii,
    features.splitScreen,
    features.preluareComenziVolan,
    conn.conectivitate,
    conn.bluetooth,
    conn.wifi,
    general.sistemOperare,
  ]
    .map(clean)
    .join(' ')
    .toLowerCase();

  const caps = {
    carplay: has(haystack, 'carplay', 'car play'),
    androidAuto: has(haystack, 'android auto'),
    wireless: has(haystack, 'wireless'),
    fourG: has(haystack, '4g', 'cartela sim', 'sim'),
    wifi: clean(conn.wifi).toUpperCase() === 'DA' || has(haystack, 'wi-fi', 'wifi', 'hotspot'),
    bluetooth: clean(conn.bluetooth).toUpperCase() === 'DA' || has(haystack, 'bluetooth'),
    steering: Boolean(clean(features.preluareComenziVolan)) || has(haystack, 'volan'),
    splitScreen: has(haystack, 'split'),
  };

  const screen = [niceInch(display.diagonalaDisplay), clean(display.tehnologieDisplay)]
    .filter(Boolean)
    .join(' ');
  const ramStorage = [clean(hw.memorieRAM), clean(hw.capacitateStocare)].filter(Boolean).join(' · ');

  // ----- Highlights (icon + label + value), capped at 4 -----
  const highlights = [];
  const pushHighlight = (iconKey, label, value) => {
    if (highlights.length >= 4 || !value) return;
    highlights.push({ iconKey, label, value });
  };

  if (caps.carplay || caps.androidAuto) {
    pushHighlight(
      'smartphone',
      'CarPlay & Android Auto',
      caps.wireless ? 'Wireless' : 'Inclus'
    );
  }
  pushHighlight('monitor', 'Ecran', screen);
  if (caps.fourG || caps.wifi) {
    pushHighlight('wifi', caps.fourG ? '4G & Wi-Fi' : 'Wi-Fi', caps.fourG ? 'Internet la bord' : 'Conectare rapidă');
  }
  pushHighlight('cpu', 'RAM & Stocare', ramStorage);
  // Backfill if we still have fewer than 4 meaningful highlights.
  if (highlights.length < 4 && caps.bluetooth) pushHighlight('bluetooth', 'Bluetooth', 'Apeluri & audio');
  if (highlights.length < 4 && clean(hw.modelProcesor)) {
    pushHighlight('cpu', 'Procesor', [clean(hw.modelProcesor), clean(hw.frecventa)].filter(Boolean).join(' '));
  }

  // ----- Lead paragraph -----
  const capPhrases = [];
  if (caps.carplay && caps.androidAuto) capPhrases.push(`Apple CarPlay și Android Auto${caps.wireless ? ' wireless' : ''}`);
  else if (caps.carplay) capPhrases.push('Apple CarPlay');
  else if (caps.androidAuto) capPhrases.push('Android Auto');
  if (caps.fourG) capPhrases.push('internet 4G');

  const leadParts = [];
  leadParts.push(
    `Sistem multimedia Android dedicat${carName ? ` pentru ${carName}` : ''}${screen ? `, cu ecran ${screen}` : ''}.`
  );
  if (capPhrases.length > 0) {
    leadParts.push(`${capPhrases.join(', ')} pentru navigație, muzică și apeluri direct de pe volan.`);
  } else if (caps.bluetooth) {
    leadParts.push('Conectare Bluetooth pentru apeluri și streaming audio.');
  }
  const lead = leadParts.join(' ');

  // ----- Benefit checklist -----
  const benefits = [];
  if (caps.carplay) benefits.push('Apple CarPlay');
  if (caps.androidAuto) benefits.push(`Android Auto${caps.wireless ? ' wireless' : ''}`);
  if (caps.fourG) benefits.push('Internet 4G + Hotspot');
  if (caps.steering) benefits.push('Comenzi pe volan păstrate');
  if (caps.bluetooth) benefits.push('Bluetooth apeluri & audio');
  if (clean(general.harta)) benefits.push(`Hartă ${clean(general.harta)}`);
  benefits.push(clean(compat.tipMontare) ? `Montare ${clean(compat.tipMontare).toLowerCase()}` : 'Montare dedicată');
  if (caps.splitScreen) benefits.push('Split screen');

  // ----- Showcase image + spec captions -----
  const images = Array.isArray(product.images) ? product.images : [];
  // Prefer a non-primary shot so the showcase differs from the gallery hero.
  const showcaseImage = images.length > 1 ? images[1] : images[0] || null;
  const captions = [];
  if (screen) captions.push(`Ecran ${screen}${clean(display.rezolutieDisplay) ? ` · ${clean(display.rezolutieDisplay)}` : ''}`);
  if (caps.carplay || caps.androidAuto) captions.push('CarPlay & Android Auto, fără cabluri');
  if (caps.steering) captions.push('Comenzile de pe volan rămân funcționale');
  if (clean(conn.conectivitate)) captions.push(clean(conn.conectivitate));

  const compatibility = carName
    ? `Compatibil cu ${carName}${clean(compat.tipMontare) ? ` · ${clean(compat.tipMontare)}` : ''}`
    : null;

  return {
    kicker: 'Navigație dedicată',
    headline,
    lead,
    highlights,
    benefits: benefits.slice(0, 6),
    showcase: showcaseImage ? { image: showcaseImage, captions: captions.slice(0, 3) } : null,
    compatibility,
  };
};
