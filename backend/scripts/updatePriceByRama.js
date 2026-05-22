const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config();

// ─── PRICE TABLE ────────────────────────────────────────────────────────────
// rama: 'low' = <100 | 'mid' = 100-200 | 'high' = >200
const SPEC_PRICES = {
  'std_2gb_32gb_4core':   { low: 849,  mid: 899,  high: 949  },
  'std_4gb_64gb_4core':   { low: 999,  mid: 1049, high: 1099 },
  'std_4gb_64gb_8core':   { low: 1399, mid: 1449, high: 1499 },
  'std_6gb_128gb_8core':  { low: 1599, mid: 1649, high: 1699 },
  '2k_4gb_64gb_8core':    { low: 1999, mid: 2049, high: 2099 },
  '2k_8gb_256gb_8core':   { low: 2799, mid: 2849, high: 2899 },
};

// ─── MODEL → RAMA CATEGORY ──────────────────────────────────────────────────
// rama: 'low' (<100) | 'mid' (100-200) | 'high' (>200)
// 'search' is matched against the product name (case-insensitive substring)
const MODEL_CONFIGS = [
  { search: 'New Beetle 2004-2010', rama: 'high' },
  // Add more models here, e.g.:
  // { search: 'Golf IV 1997-2004', rama: 'low' },
];

// ─── SPEC DETECTION ─────────────────────────────────────────────────────────
function getSpecKey(name) {
  const is2K    = /\b2K\b/i.test(name);

  const is2GBRAM  = /\b2\s*GB\b/i.test(name);
  const is4GBRAM  = /\b4\s*GB\b/i.test(name);
  const is6GBRAM  = /\b6\s*GB\b/i.test(name);
  const is8GBRAM  = /\b8\s*GB\b/i.test(name);

  const is32GB  = /\b32\s*GB\b/i.test(name);
  const is64GB  = /\b64\s*GB\b/i.test(name);
  const is128GB = /\b128\s*GB\b/i.test(name);
  const is256GB = /\b256\s*GB\b/i.test(name);

  const is4Core = /\b4\s*Core\b/i.test(name) || /\bQuad[\s-]*Core\b/i.test(name);
  const is8Core = /\b8\s*Core\b/i.test(name) || /\bOcta[\s-]*Core\b/i.test(name);

  // Most specific first
  if (is2K   && is8GBRAM && is256GB && is8Core) return '2k_8gb_256gb_8core';
  if (is2K   && is4GBRAM && is64GB  && is8Core) return '2k_4gb_64gb_8core';
  if (is6GBRAM && is128GB && is8Core)            return 'std_6gb_128gb_8core';
  if (is4GBRAM && is64GB  && is8Core)            return 'std_4gb_64gb_8core';
  if (is4GBRAM && is64GB  && is4Core)            return 'std_4gb_64gb_4core';
  if (is2GBRAM && is32GB  && is4Core)            return 'std_2gb_32gb_4core';

  return null;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function updatePriceByRama() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    for (const config of MODEL_CONFIGS) {
      const { search, rama } = config;
      console.log(`\n>>> Processing: "${search}" (rama: ${rama})`);

      const products = await Product.find({
        name: { $regex: search, $options: 'i' }
      });

      console.log(`    Found ${products.length} products`);

      let updated = 0;
      let skipped = 0;
      let unknown = 0;

      for (const product of products) {
        const imageCount = product.images ? product.images.length : 0;

        if (imageCount >= 18) {
          console.log(`    SKIP (${imageCount} images): "${product.name}"`);
          skipped++;
          continue;
        }

        const specKey = getSpecKey(product.name || '');

        if (!specKey) {
          console.log(`    UNKNOWN SPEC: "${product.name}"`);
          unknown++;
          continue;
        }

        const newPrice = SPEC_PRICES[specKey][rama];
        await Product.updateOne({ _id: product._id }, { $set: { price: newPrice } });
        console.log(`    [${newPrice} RON] "${product.name}" | was ${product.price} RON | images: ${imageCount} | spec: ${specKey}`);
        updated++;
      }

      console.log(`    Done — updated: ${updated}, skipped (18+ images): ${skipped}, unknown spec: ${unknown}`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePriceByRama();
