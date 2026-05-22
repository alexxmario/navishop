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
// Only list models that are NOT mid tier.
// Any VW/Volkswagen product not matching these defaults to 'mid'.
// 'search' is matched case-insensitively against the product name.

const HIGH_MODELS = [
  'New Beetle 2004-2010',
];

const LOW_MODELS = [
  'Passat B6',
  'Polo 2009-2018',
  'Polo 6R 2009-2018',
  'Tiguan 2016-2020',
  'Passat B7',
  'Golf 6 2008-2014',
  'Golf 2008-2014',
  'Tiguan 2007-2018',
];

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

function getRamaForProduct(name) {
  for (const search of HIGH_MODELS) {
    if (name.toLowerCase().includes(search.toLowerCase())) return 'high';
  }
  for (const search of LOW_MODELS) {
    if (name.toLowerCase().includes(search.toLowerCase())) return 'low';
  }
  return 'mid'; // default for all other VW/BMW models
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function updatePriceByRama() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    // Fetch all VW/Volkswagen/BMW products with under 18 images
    const products = await Product.find({
      $or: [
        { brand: { $regex: /^VW$/i } },
        { brand: { $regex: /^Volkswagen$/i } },
        { brand: { $regex: /^BMW$/i } },
        { name:  { $regex: /VW|Volkswagen|BMW/i } },
      ]
    });

    console.log(`Found ${products.length} VW/Volkswagen/BMW products total`);

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

      const rama     = getRamaForProduct(name);
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
