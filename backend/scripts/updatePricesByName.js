/**
 * Reprice "Navigatie" head units from tokens in the product NAME.
 *
 * Engine: each brand has an ordered list of rules. A rule matches when ALL of
 * its `when` regexes are found in the name; the FIRST matching rule wins. So
 * order encodes precedence — put specific-model rules above generic ones.
 *
 * Only products whose name contains "Navigatie" are ever touched (excludes
 * CarPlay modules etc).
 *
 * Usage:
 *   node scripts/updatePricesByName.js               # DRY RUN — prints matches, changes nothing
 *   node scripts/updatePricesByName.js --apply        # actually writes the new prices
 *   node scripts/updatePricesByName.js --brand=audi   # limit to one brand (optional)
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');
const ONLY_BRAND = (process.argv.find((a) => a.startsWith('--brand=')) || '').split('=')[1];

// Only ever reprice actual head units ("Navigatie ...").
const REQUIRE_IN_NAME = /navigatie/i;

// ---- Shared token regexes -------------------------------------------------
// Screen sizes. Decimal may be written with "." or ",". (?!\d) stops 12.3 from
// matching inside 12.30 etc.
const INCH = {
  '8.8': /\b8[.,]8(?!\d)/,
  '9': /\b9\s*(?:inch|")/i, // 9" needs the word/symbol so stray 9s don't match
  '10.25': /\b10[.,]25(?!\d)/,
  '12.3': /\b12[.,]3(?!\d)/,
};
// RAM. \b stops storage (64GB/128GB/256GB) from being read as RAM.
const RAM = {
  '4GB': /\b4\s*GB\b/i,
  // Higher tier — Audi's sheet wrote "9GB"; accept 8GB or 9GB.
  '8or9GB': /\b[89]\s*GB\b/i,
};
const MODEL = {
  audiA6: /\bA6\b/i,
  audiC7: /\bC7\b/i,
  audiQ5: /\bQ5\b/i,
  audiQ3: /\bQ3\b/i,
};

// ---- Audi: price = f(model, inch, ram), no tech token --------------------
// Specific models first, then generic Audi.
const AUDI = {
  name: 'Audi',
  match: { $or: [{ brand: /audi/i }, { name: /audi/i }] },
  // No scope gate: any unmatched Audi "Navigatie" gets reported.
  rules: [
    { label: 'Q5 12.3 8GB',    when: [MODEL.audiQ5, INCH['12.3'], RAM['8or9GB']], price: 3450 },
    { label: 'Q3 12.3 8GB',    when: [MODEL.audiQ3, INCH['12.3'], RAM['8or9GB']], price: 3450 },
    { label: 'A6 C7 9 4GB',    when: [MODEL.audiA6, MODEL.audiC7, INCH['9'],     RAM['4GB']],    price: 3130 },
    { label: 'A6 C7 9 8GB',    when: [MODEL.audiA6, MODEL.audiC7, INCH['9'],     RAM['8or9GB']], price: 3450 },
    { label: 'A6 C7 12.3 4GB', when: [MODEL.audiA6, MODEL.audiC7, INCH['12.3'],  RAM['4GB']],    price: 3130 },
    { label: 'A6 C7 12.3 8GB', when: [MODEL.audiA6, MODEL.audiC7, INCH['12.3'],  RAM['8or9GB']], price: 3450 },
    { label: '8.8 4GB',        when: [INCH['8.8'],   RAM['4GB']],    price: 2475 },
    { label: '8.8 8GB',        when: [INCH['8.8'],   RAM['8or9GB']], price: 2990 },
    { label: '10.25 4GB',      when: [INCH['10.25'], RAM['4GB']],    price: 2690 },
    { label: '10.25 8GB',      when: [INCH['10.25'], RAM['8or9GB']], price: 3115 },
  ],
};

let BRANDS = [AUDI];
if (ONLY_BRAND) {
  BRANDS = BRANDS.filter((b) => b.name.toLowerCase() === ONLY_BRAND.toLowerCase());
}

// First rule whose every `when` regex is found in the name.
function firstMatchingRule(name, rules) {
  return rules.find((r) => r.when.every((rx) => rx.test(name))) || null;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log(`Connected to MongoDB — ${APPLY ? 'APPLY MODE (writing)' : 'DRY RUN (no changes)'}\n`);

  let totalUpdated = 0;
  let totalUnchanged = 0;

  for (const brand of BRANDS) {
    const products = await Product.find(brand.match).select('name brand price');
    console.log(`=== ${brand.name}: ${products.length} candidate products ===\n`);

    const updates = [];
    const skipped = [];

    for (const product of products) {
      const name = product.name || '';
      if (!REQUIRE_IN_NAME.test(name)) continue; // not a "Navigatie" head unit

      const rule = firstMatchingRule(name, brand.rules);
      if (rule) {
        updates.push({ id: product._id, name, oldPrice: product.price, newPrice: rule.price, label: rule.label });
      } else if (!brand.scope || brand.scope.test(name)) {
        skipped.push({ name, price: product.price });
      }
    }

    for (const u of updates) {
      const changed = u.oldPrice !== u.newPrice;
      if (changed) totalUpdated++; else totalUnchanged++;
      const tag = changed ? `${u.oldPrice} -> ${u.newPrice}` : `${u.newPrice} (unchanged)`;
      console.log(`[${u.label}] ${tag}  |  ${u.name}`);
      if (APPLY && changed) {
        await Product.updateOne({ _id: u.id }, { $set: { price: u.newPrice } });
      }
    }

    if (skipped.length) {
      console.log(`\n--- ${brand.name}: skipped ${skipped.length} (in scope but no matching price rule) ---`);
      skipped.forEach((s) => console.log(`  - (${s.price}) ${s.name}`));
    }

    console.log(`\n${brand.name}: ${updates.length} matched, ${skipped.length} skipped\n`);
  }

  console.log('=== SUMMARY ===');
  console.log(`Would change price : ${totalUpdated}`);
  console.log(`Already correct    : ${totalUnchanged}`);
  console.log(APPLY ? '\nChanges APPLIED.' : '\nDRY RUN — re-run with --apply to write these changes.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
