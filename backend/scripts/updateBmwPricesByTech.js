/**
 * Update product prices based on the technology token, screen size (inches)
 * and RAM found in the product NAME.
 *
 * Currently configured for BMW. The structure (PRICE_RULES) is designed so we
 * can add more brands with their own patterns later.
 *
 * Usage:
 *   node scripts/updateBmwPricesByTech.js          # DRY RUN — prints matches, changes nothing
 *   node scripts/updateBmwPricesByTech.js --apply   # actually writes the new prices
 *
 * Price matrix (BMW):
 *   NBT / CIC / CCC          EVO / NOS
 *   10.25 4GB = 2475         10.25 4GB = 2775
 *   10.25 8GB = 2795         10.25 8GB = 3095
 *   12.3  4GB = 2795         12.3  4GB = 3095
 *   12.3  8GB = 3115         12.3  8GB = 3415
 *   12.9  4GB = 3295         12.9  4GB = 3595
 *   12.9  8GB = 3615         12.9  8GB = 3915
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');

// Only ever reprice actual head units ("Navigatie ..."). This deliberately
// excludes CarPlay modules ("Modul Wireless Carplay ...") and anything else
// that happens to carry a tech token. Applies to every brand below.
const REQUIRE_IN_NAME = /navigatie/i;

// ---- Brand configuration -------------------------------------------------
// Each brand defines:
//   match:      how to find candidate products (Mongo query)
//   techGroups: ordered list of { id, label, regex } — first matching group wins
//   inches:     ordered list of { id, regex }
//   rams:       ordered list of { id, regex }
//   prices:     { [techGroupId]: { [`${inchId}|${ramId}`]: number } }

const BMW = {
  name: 'BMW',
  match: {
    $or: [{ brand: /bmw/i }, { name: /bmw/i }],
  },
  techGroups: [
    { id: 'nbt', label: 'NBT/CIC/CCC', regex: /\b(NBT|CIC|CCC)\b/i },
    { id: 'evo', label: 'EVO/NOS',     regex: /\b(EVO|NOS)\b/i },
  ],
  inches: [
    { id: '10.25', regex: /\b10[.,]25(?!\d)/ },
    { id: '12.3',  regex: /\b12[.,]3(?!\d)/ },
    { id: '12.9',  regex: /\b12[.,]9(?!\d)/ },
  ],
  rams: [
    { id: '4GB', regex: /\b4\s*GB\b/i },
    { id: '8GB', regex: /\b8\s*GB\b/i },
  ],
  prices: {
    nbt: {
      '10.25|4GB': 2475,
      '10.25|8GB': 2795,
      '12.3|4GB': 2795,
      '12.3|8GB': 3115,
      '12.9|4GB': 3295,
      '12.9|8GB': 3615,
    },
    evo: {
      '10.25|4GB': 2775,
      '10.25|8GB': 3095,
      '12.3|4GB': 3095,
      '12.3|8GB': 3415,
      '12.9|4GB': 3595,
      '12.9|8GB': 3915,
    },
  },
};

const BRANDS = [BMW];

// Return the single id whose regex matches `name`, or:
//   null      -> no match
//   '__multi' -> more than one matched (ambiguous)
function matchOne(name, defs) {
  const hits = defs.filter((d) => d.regex.test(name)).map((d) => d.id);
  if (hits.length === 0) return null;
  if (hits.length > 1) return '__multi';
  return hits[0];
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log(`Connected to MongoDB — ${APPLY ? 'APPLY MODE (writing)' : 'DRY RUN (no changes)'}\n`);

  let totalMatched = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;

  for (const brand of BRANDS) {
    const products = await Product.find(brand.match).select('name brand price');
    console.log(`=== ${brand.name}: ${products.length} candidate products ===\n`);

    const updates = [];
    const skipped = [];

    for (const product of products) {
      const name = product.name || '';

      if (!REQUIRE_IN_NAME.test(name)) continue; // not a "Navigatie" head unit -> out of scope

      const tech = matchOne(name, brand.techGroups);
      if (!tech) continue; // no tech token -> not in scope at all

      const inch = matchOne(name, brand.inches);
      const ram = matchOne(name, brand.rams);

      if (tech === '__multi' || inch === '__multi' || ram === '__multi') {
        skipped.push({ name, price: product.price, reason: 'ambiguous (multiple tech/inch/RAM tokens)' });
        continue;
      }
      if (!inch) {
        skipped.push({ name, price: product.price, reason: 'no screen size (10.25/12.3/12.9) in name' });
        continue;
      }
      if (!ram) {
        skipped.push({ name, price: product.price, reason: 'no RAM (4GB/8GB) in name' });
        continue;
      }

      const key = `${inch}|${ram}`;
      const newPrice = brand.prices[tech] && brand.prices[tech][key];
      if (newPrice == null) {
        skipped.push({ name, price: product.price, reason: `no price rule for ${tech} ${key}` });
        continue;
      }

      totalMatched++;
      updates.push({ id: product._id, name, oldPrice: product.price, newPrice, tech, inch, ram });
    }

    // Print matched updates
    for (const u of updates) {
      const changed = u.oldPrice !== u.newPrice;
      if (changed) totalUpdated++; else totalUnchanged++;
      const tag = changed ? `${u.oldPrice} -> ${u.newPrice}` : `${u.newPrice} (unchanged)`;
      console.log(`[${u.tech.toUpperCase()} ${u.inch} ${u.ram}] ${tag}  |  ${u.name}`);

      if (APPLY && changed) {
        await Product.updateOne({ _id: u.id }, { $set: { price: u.newPrice } });
      }
    }

    if (skipped.length) {
      console.log(`\n--- ${brand.name}: skipped ${skipped.length} (had a tech token but couldn't be priced) ---`);
      skipped.forEach((s) => console.log(`  - [${s.reason}] (${s.price}) ${s.name}`));
    }
    console.log('');
  }

  console.log('=== SUMMARY ===');
  console.log(`Matched to a price rule : ${totalMatched}`);
  console.log(`Would change price      : ${totalUpdated}`);
  console.log(`Already correct         : ${totalUnchanged}`);
  console.log(APPLY ? '\nChanges APPLIED.' : '\nDRY RUN — re-run with --apply to write these changes.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
