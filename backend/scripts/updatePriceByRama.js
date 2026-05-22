const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config();

// ─── PRICE TABLE ────────────────────────────────────────────────────────────
// rama: 'low' = <100 | 'mid' = 100-200 | 'high' = >200
const SPEC_PRICES = {
  'std_2gb_32gb_4core':  { low: 849,  mid: 899,  high: 949  },
  'std_4gb_64gb_4core':  { low: 999,  mid: 1049, high: 1099 },
  'std_4gb_64gb_8core':  { low: 1399, mid: 1449, high: 1499 },
  'std_6gb_128gb_8core': { low: 1599, mid: 1649, high: 1699 },
  '2k_4gb_64gb_8core':   { low: 1999, mid: 2049, high: 2099 },
  '2k_8gb_256gb_8core':  { low: 2799, mid: 2849, high: 2899 },
};

// ─── EXPLICIT MODEL OVERRIDES ────────────────────────────────────────────────
// HIGH_MODELS / LOW_MODELS: matched first, in order.
// MID_MODELS: only needed for brands whose default is LOW (e.g. Toyota).
// BRAND_LOW_DEFAULT: brands where unmatched products fall to 'low' instead of 'mid'.
// 'search' is matched case-insensitively against the product name.

const HIGH_MODELS = [
  // VW
  'New Beetle 2004-2010',
  // Mercedes
  'Sprinter 2018-2022',
  // Audi
  'Q3 2011-2018',
  // Ford
  'Focus 2011-2019',
  'Transit Connect dupa 2013',
  // Opel
  'Astra H',
  'Antara 2006-2017',
  'Corsa D',
  'Vectra C',
  // Dacia
  'Logan 2021-2023',
  'Duster 2014-2018',
  // Renault
  'Master 2020-2024',
  'Megane 2009-2016',
  'Arkana 2019-2023',
  'Clio 4',
  'Clio 5',
  'Fluence 2009-2016',
  'Trafic 3',
  'Twingo',
  // Peugeot
  'Peugeot 407',
  // Honda
  'Accord 8',
  'Civic 8 Hatchback',
  // Hyundai
  'IX35 2015-2020',
  // Mazda
  'Mazda 3 2013-2018',
  // Volvo
  'XC60',
  'S60 2',
  // Fiat
  'Freemont',
  // Jeep
  'Wrangler Rubicon',
];

const LOW_MODELS = [
  // VW
  'Passat B6',
  'Polo 2009-2018',
  'Polo 6R 2009-2018',
  'Tiguan 2016-2020',
  'Passat B7',
  'Golf 6 2008-2014',
  'Golf 2008-2014',
  'Tiguan 2007-2018',
  // Ford
  'Focus 2004-2011',
  'S-Max 2006-2015',
  'Fiesta 2006-2011',
  'Fiesta 06-11',
  'Transit Connect 2008-2011',
  'Transit Connect 08-11',
  'Ranger 2005-2011',
  // Dacia
  'Dokker 2012-2020',
  'Logan 2008-2012',
  'Logan 2012-2020',
  'Logan 2004-2008',
  // Peugeot
  'Peugeot 307',
  'Peugeot 206+',
  'Peugeot 308 2013-2021',
  'Peugeot 301',
  'Peugeot 207',
  'Peugeot 308 2007-2015',
  // Citroen
  'C4 2010-2018',
  // Seat
  'Leon 3',
  // Fiat
  'Bravo',
  // Honda
  'CRV 2008-2011',
  'CRV 2002-2006',
  // Mazda
  'BT 50 2005-2011',
  'Mazda 6 2008-2013',
  // Nissan
  'Xtrail T31',
  'Juke',
  'Qashqai J10',
  // Mitsubishi
  'Outlander 2',
  'Outlander 3',
  'Lancer',
  'ASX 2010-2016',
  'Pajero Sport',
];

// Models that are MID within a brand that otherwise defaults to LOW
const MID_MODELS = [
  // Toyota (all others are low)
  'Aygo 2005-2014',
  'Auris e18',
  'CHR',
  'Corolla e21',
  'Yaris p13',
  'Land Cruiser Prado J15',
  'Land Cruiser Prado J12',
  'Corolla e18',
  // Chevrolet (all others are low)
  'Cruze 2008-2012',
  'Cruze 2012-2015',
  // Hyundai (all others are low)
  'Elantra dupa 2020',
  'Bayon',
  'Santa Fe 1',
  'Ioniq',
  // Suzuki (all others are low)
  'Vitara 2015-2023',
  // Skoda (all others are low)
  'Fabia 3',
  'Rapid',
  'Superb 3',
  'Kodiaq',
];

// Brands where unmatched products fall to 'low' (instead of the global 'mid' default)
const BRAND_LOW_DEFAULT = ['toyota', 'hyundai', 'suzuki', 'subaru', 'kia', 'skoda', 'škoda', 'chevrolet', 'smart'];

// ─── SPEC DETECTION ──────────────────────────────────────────────────────────
const SPEC_PATTERNS = [
  { key: '2k_8gb_256gb_8core',  test: n => /\b2K\b/i.test(n) && /\b8\s*GB\b/i.test(n) && /\b256\s*GB\b/i.test(n) && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: '2k_4gb_64gb_8core',   test: n => /\b2K\b/i.test(n) && /\b4\s*GB\b/i.test(n) && /\b64\s*GB\b/i.test(n)  && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: 'std_6gb_128gb_8core', test: n => /\b6\s*GB\b/i.test(n) && /\b128\s*GB\b/i.test(n) && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: 'std_4gb_64gb_8core',  test: n => !/\b2K\b/i.test(n) && /\b4\s*GB\b/i.test(n) && /\b64\s*GB\b/i.test(n)  && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: 'std_4gb_64gb_4core',  test: n => /\b4\s*GB\b/i.test(n) && /\b64\s*GB\b/i.test(n)  && (/\b4\s*Core\b/i.test(n) || /\bQuad[\s-]*Core\b/i.test(n)) },
  { key: 'std_2gb_32gb_4core',  test: n => /\b2\s*GB\b/i.test(n) && /\b32\s*GB\b/i.test(n)  && (/\b4\s*Core\b/i.test(n) || /\bQuad[\s-]*Core\b/i.test(n)) },
];

function detectSpecKey(name) {
  for (const { key, test } of SPEC_PATTERNS) {
    if (test(name)) return key;
  }
  return null;
}

function getRamaForProduct(name, brand) {
  const nameLower  = name.toLowerCase();
  const brandLower = (brand || '').toLowerCase();

  for (const search of HIGH_MODELS) {
    if (nameLower.includes(search.toLowerCase())) return 'high';
  }
  for (const search of LOW_MODELS) {
    if (nameLower.includes(search.toLowerCase())) return 'low';
  }
  for (const search of MID_MODELS) {
    if (nameLower.includes(search.toLowerCase())) return 'mid';
  }

  // Brands that default to low when no explicit match found
  if (BRAND_LOW_DEFAULT.some(b => brandLower.includes(b) || nameLower.includes(b))) return 'low';

  return 'mid';
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function updatePriceByRama() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    // Fetch all VW/Volkswagen/BMW/Mercedes products with under 18 images
    const products = await Product.find({
      $or: [
        { brand: { $regex: /^VW$/i } },
        { brand: { $regex: /^Volkswagen$/i } },
        { brand: { $regex: /^BMW$/i } },
        { brand: { $regex: /^Mercedes$/i } },
        { brand: { $regex: /^Mercedes-Benz$/i } },
        { brand: { $regex: /^Audi$/i } },
        { brand: { $regex: /^Porsche$/i } },
        { brand: { $regex: /^Ford$/i } },
        { brand: { $regex: /^Opel$/i } },
        { brand: { $regex: /^Dacia$/i } },
        { brand: { $regex: /^Renault$/i } },
        { brand: { $regex: /^Peugeot$/i } },
        { brand: { $regex: /^Citroen$/i } },
        { brand: { $regex: /^Citroën$/i } },
        { brand: { $regex: /^Toyota$/i } },
        { brand: { $regex: /^Honda$/i } },
        { brand: { $regex: /^Hyundai$/i } },
        { brand: { $regex: /^Mazda$/i } },
        { brand: { $regex: /^Suzuki$/i } },
        { brand: { $regex: /^Mitsubishi$/i } },
        { brand: { $regex: /^Alfa Romeo$/i } },
        { brand: { $regex: /^Subaru$/i } },
        { brand: { $regex: /^Volvo$/i } },
        { brand: { $regex: /^Nissan$/i } },
        { brand: { $regex: /^Kia$/i } },
        { brand: { $regex: /^Skoda$/i } },
        { brand: { $regex: /^Škoda$/i } },
        { brand: { $regex: /^Seat$/i } },
        { brand: { $regex: /^Fiat$/i } },
        { brand: { $regex: /^Jeep$/i } },
        { brand: { $regex: /^Chevrolet$/i } },
        { brand: { $regex: /^Smart$/i } },
        { brand: { $regex: /^Land Rover$/i } },
        { name:  { $regex: /VW|Volkswagen|BMW|Mercedes|Audi|Porsche|Ford|Opel|Dacia|Renault|Peugeot|Citro|Toyota|Honda|Hyundai|Mazda|Suzuki|Mitsubishi|Alfa Romeo|Subaru|Volvo|Nissan|Kia|Skoda|Škoda|Seat|Fiat|Jeep|Chevrolet|Smart|Land Rover/i } },
      ]
    });

    console.log(`Found ${products.length} VW/BMW/Mercedes/Audi/Porsche/Ford/Opel/Dacia/Renault/Peugeot/Citroen/Toyota products total`);

    const results = { low: 0, mid: 0, high: 0, skipped: 0, unknown: 0 };

    for (const product of products) {
      const imageCount = product.images ? product.images.length : 0;

      if (imageCount >= 18) {
        results.skipped++;
        continue;
      }

      const name    = product.name || '';
      const specKey = detectSpecKey(name);

      if (!specKey) {
        console.log(`UNKNOWN SPEC: "${name}"`);
        results.unknown++;
        continue;
      }

      const rama     = getRamaForProduct(name, product.brand);
      const newPrice = SPEC_PRICES[specKey][rama];

      await Product.updateOne({ _id: product._id }, { $set: { price: newPrice } });
      console.log(`[${rama.toUpperCase()} / ${newPrice} RON] "${name}" | was ${product.price} RON | images: ${imageCount}`);
      results[rama]++;
    }

    console.log('\n=== SUMMARY ===');
    console.log(`High tier updated : ${results.high}`);
    console.log(`Mid  tier updated : ${results.mid}`);
    console.log(`Low  tier updated : ${results.low}`);
    console.log(`Skipped (18+ imgs): ${results.skipped}`);
    console.log(`Unknown spec      : ${results.unknown}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePriceByRama();
