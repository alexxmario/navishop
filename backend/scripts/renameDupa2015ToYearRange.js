require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Model-specific year ranges
const REPLACEMENTS = [
  { regex: /Caravelle\s+dupa\s+2015/gi, replacement: 'Caravelle 2015-2022' },
  { regex: /Multivan\s+T6\s+dupa\s+2015/gi, replacement: 'Multivan T6 2015-2020' },
  { regex: /Multivan\s+dupa\s+2015/gi, replacement: 'Multivan 2015-2020' },
  { regex: /Transporter\s+T6\s+dupa\s+2015/gi, replacement: 'Transporter T6 2015-2022' },
  { regex: /Transporter\s+dupa\s+2015/gi, replacement: 'Transporter 2015-2022' },
];

function applyReplacements(text) {
  if (!text) return text;
  let result = text;
  for (const { regex, replacement } of REPLACEMENTS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

async function main() {
  const executeMode = process.argv.includes('--execute');

  console.log('=== Rename "dupa 2015" → year ranges (names only) ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE (will update DB)' : 'DRY RUN (use --execute to update)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  const products = await Product.find({
    name: { $regex: /dupa\s+2015/i }
  });

  console.log(`Found ${products.length} products with "dupa 2015" in the name:\n`);

  let updatedCount = 0;
  for (const p of products) {
    const newName = applyReplacements(p.name);

    if (newName === p.name) {
      console.log(`  [NO MATCH] "${p.name}"`);
      continue;
    }

    console.log(`  "${p.name}"`);
    console.log(`  → "${newName}"\n`);

    if (executeMode) {
      p.name = newName;
      await p.save();
      updatedCount++;
    }
  }

  if (executeMode) {
    console.log(`\nUpdated ${updatedCount} product names.`);
  } else {
    console.log('DRY RUN complete. Run with --execute to update products.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
