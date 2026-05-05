require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function main() {
  const executeMode = process.argv.includes('--execute');

  console.log('=== Fix romanianSpecs.general.categorii ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE' : 'DRY RUN (use --execute to apply)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  // Find all products where categorii still mentions Beetle
  const products = await Product.find({
    'romanianSpecs.general.categorii': { $regex: /Beetle/i }
  }).select('name model compatibility romanianSpecs').lean();

  console.log(`Found ${products.length} products with "Beetle" in categorii\n`);

  if (products.length === 0) {
    console.log('Nothing to fix.');
    await mongoose.disconnect();
    return;
  }

  let fixedCount = 0;
  let skippedCount = 0;

  for (const p of products) {
    const oldCategorii = p.romanianSpecs?.general?.categorii || '';

    // Skip actual Beetle products
    if (p.name && /\bBeetle\b/i.test(p.name)) {
      skippedCount++;
      continue;
    }

    // Derive the correct categorii from the product's model and compatibility
    const model = p.model || '';
    const compat = p.compatibility?.[0];
    const yearFrom = compat?.yearFrom || '';
    const yearTo = compat?.yearTo || '';

    if (!model) {
      console.log(`  [SKIP] "${p.name}" - no model field set`);
      skippedCount++;
      continue;
    }

    const newCategorii = `${model} (${yearFrom}-${yearTo})`;

    console.log(`  [FIX] "${p.name}"`);
    console.log(`    "${oldCategorii}" → "${newCategorii}"`);

    if (executeMode) {
      await Product.updateOne(
        { _id: p._id },
        { $set: { 'romanianSpecs.general.categorii': newCategorii } }
      );
    }
    fixedCount++;
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Total with Beetle categorii: ${products.length}`);
  console.log(`  Fixed: ${fixedCount}`);
  console.log(`  Skipped (actual Beetle products): ${skippedCount}`);

  if (!executeMode) {
    console.log('\nDRY RUN complete. Run with --execute to apply changes.');
  } else {
    console.log('\nAll changes applied.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
