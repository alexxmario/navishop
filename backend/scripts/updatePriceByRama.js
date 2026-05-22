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

// ─── MODEL CONFIGS ───────────────────────────────────────────────────────────
// search : substring matched against product name (case-insensitive)
// spec   : key from SPEC_PRICES above — you define which tier each model uses
// rama   : 'low' (<100) | 'mid' (100-200) | 'high' (>200)
//
// A model can appear multiple times if it has products in different spec tiers.
const MODEL_CONFIGS = [
  { search: 'New Beetle 2004-2010', spec: 'std_2gb_32gb_4core',  rama: 'high' },
  { search: 'New Beetle 2004-2010', spec: 'std_4gb_64gb_4core',  rama: 'high' },
  { search: 'New Beetle 2004-2010', spec: 'std_4gb_64gb_8core',  rama: 'high' },
  { search: 'New Beetle 2004-2010', spec: 'std_6gb_128gb_8core', rama: 'high' },
  { search: 'New Beetle 2004-2010', spec: '2k_4gb_64gb_8core',   rama: 'high' },
  { search: 'New Beetle 2004-2010', spec: '2k_8gb_256gb_8core',  rama: 'high' },
];

// ─── SPEC KEY → NAME PATTERNS ────────────────────────────────────────────────
// Used only to identify which product variant a name belongs to within a model.
// Ordered most-specific first to avoid false matches.
const SPEC_PATTERNS = [
  { key: '2k_8gb_256gb_8core',   test: n => /\b2K\b/i.test(n) && /\b8\s*GB\b/i.test(n) && /\b256\s*GB\b/i.test(n) && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: '2k_4gb_64gb_8core',    test: n => /\b2K\b/i.test(n) && /\b4\s*GB\b/i.test(n) && /\b64\s*GB\b/i.test(n)  && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: 'std_6gb_128gb_8core',  test: n => /\b6\s*GB\b/i.test(n) && /\b128\s*GB\b/i.test(n) && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: 'std_4gb_64gb_8core',   test: n => !/\b2K\b/i.test(n) && /\b4\s*GB\b/i.test(n) && /\b64\s*GB\b/i.test(n)  && (/\b8\s*Core\b/i.test(n) || /\bOcta[\s-]*Core\b/i.test(n)) },
  { key: 'std_4gb_64gb_4core',   test: n => /\b4\s*GB\b/i.test(n) && /\b64\s*GB\b/i.test(n)  && (/\b4\s*Core\b/i.test(n) || /\bQuad[\s-]*Core\b/i.test(n)) },
  { key: 'std_2gb_32gb_4core',   test: n => /\b2\s*GB\b/i.test(n) && /\b32\s*GB\b/i.test(n)  && (/\b4\s*Core\b/i.test(n) || /\bQuad[\s-]*Core\b/i.test(n)) },
];

function detectSpecKey(name) {
  for (const { key, test } of SPEC_PATTERNS) {
    if (test(name)) return key;
  }
  return null;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function updatePriceByRama() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    // Group configs by search string so we only query each model once
    const bySearch = {};
    for (const config of MODEL_CONFIGS) {
      if (!bySearch[config.search]) bySearch[config.search] = [];
      bySearch[config.search].push(config);
    }

    for (const [search, configs] of Object.entries(bySearch)) {
      console.log(`\n>>> Model: "${search}"`);

      const products = await Product.find({
        name: { $regex: search, $options: 'i' }
      });

      console.log(`    Found ${products.length} products`);

      let updated = 0, skipped = 0, unmatched = 0;

      for (const product of products) {
        const imageCount = product.images ? product.images.length : 0;

        if (imageCount >= 18) {
          skipped++;
          continue;
        }

        const detectedSpec = detectSpecKey(product.name || '');
        const config = configs.find(c => c.spec === detectedSpec);

        if (!config) {
          console.log(`    UNMATCHED: "${product.name}" (detected: ${detectedSpec || 'none'})`);
          unmatched++;
          continue;
        }

        const newPrice = SPEC_PRICES[config.spec][config.rama];
        await Product.updateOne({ _id: product._id }, { $set: { price: newPrice } });
        console.log(`    [${newPrice} RON] "${product.name}" | was ${product.price} RON | images: ${imageCount}`);
        updated++;
      }

      console.log(`    Done — updated: ${updated} | skipped (18+ images): ${skipped} | unmatched spec: ${unmatched}`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePriceByRama();
