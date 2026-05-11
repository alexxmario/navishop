require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ─── Target models to clone Beetle products into ────────────────────────────
const TARGET_MODELS = [
  { name: 'Caravelle T6', yearFrom: 2015, yearTo: 2022, skuPrefix: 'CRVT6' },
  { name: 'Transporter T6', yearFrom: 2015, yearTo: 2022, skuPrefix: 'TRT6' },
  { name: 'Multivan T6', yearFrom: 2015, yearTo: 2020, skuPrefix: 'MLVT6' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateSlug = (name = '') => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const SOURCE_SKU_PREFIXES = ['VWBEETLE1119', 'BEETLE1119'];

function parseSourceSku(sku) {
  for (const prefix of SOURCE_SKU_PREFIXES) {
    if (sku.startsWith(prefix)) {
      return { prefix, remainder: sku.substring(prefix.length) };
    }
  }
  return null;
}

function buildSkuYearPart(yearFrom, yearTo) {
  return String(yearFrom).slice(2) + String(yearTo).slice(2);
}

function buildNewSku(parsed, target) {
  const vwPrefix = parsed.prefix.startsWith('VW') ? 'VW' : '';
  return vwPrefix + target.skuPrefix + buildSkuYearPart(target.yearFrom, target.yearTo) + parsed.remainder;
}

function replaceModelRefs(text, target) {
  if (!text) return text;
  const targetFull = `${target.name} ${target.yearFrom}-${target.yearTo}`;
  let result = text.replace(/Beetle\s+2011[\s–-]+2019/gi, targetFull);
  result = result.replace(/\bBeetle\b/gi, target.name);
  return result;
}

// ─── Clone a single product for a target model ──────────────────────────────

function cloneProduct(source, target) {
  const newName = source.name.replace(
    /Beetle\s+2011[\s–-]+2019/i,
    `${target.name} ${target.yearFrom}-${target.yearTo}`
  );
  const newSlug = generateSlug(newName);

  const parsed = parseSourceSku(source.sku);
  if (!parsed) {
    console.log(`  [WARN] SKU "${source.sku}" doesn't match any known Beetle prefix, skipping for ${target.name}`);
    return null;
  }
  const newSku = buildNewSku(parsed, target);

  const clone = JSON.parse(JSON.stringify(source));

  delete clone._id;
  delete clone.__v;
  delete clone.createdAt;
  delete clone.updatedAt;

  clone.name = newName;
  clone.slug = newSlug;
  clone.sku = newSku;
  clone.model = target.name;

  clone.description = replaceModelRefs(source.description, target);
  if (clone.shortDescription) {
    clone.shortDescription = replaceModelRefs(source.shortDescription, target);
  }

  if (clone.structuredDescription?.sections) {
    clone.structuredDescription.sections = clone.structuredDescription.sections.map(section => ({
      ...section,
      title: replaceModelRefs(section.title, target),
      points: section.points?.map(p => replaceModelRefs(p, target)) || []
    }));
    if (clone.structuredDescription.originalDescription) {
      clone.structuredDescription.originalDescription = replaceModelRefs(
        clone.structuredDescription.originalDescription, target
      );
    }
    clone.structuredDescription.parsedAt = new Date();
  }

  clone.images = source.images.map(img => ({
    url: img.url,
    alt: replaceModelRefs(img.alt, target),
    isPrimary: img.isPrimary
  }));

  clone.compatibility = [{
    brand: 'VW',
    model: target.name,
    models: [target.name],
    yearFrom: target.yearFrom,
    yearTo: target.yearTo,
    years: Array.from(
      { length: target.yearTo - target.yearFrom + 1 },
      (_, i) => target.yearFrom + i
    )
  }];

  if (clone.romanianSpecs?.compatibility?.destinatPentru) {
    clone.romanianSpecs.compatibility.destinatPentru = replaceModelRefs(
      clone.romanianSpecs.compatibility.destinatPentru, target
    );
  }
  if (clone.romanianSpecs?.general?.sku) {
    clone.romanianSpecs.general.sku = newSku;
  }
  if (clone.romanianSpecs?.general?.categorii) {
    clone.romanianSpecs.general.categorii = `${target.name} (${target.yearFrom}-${target.yearTo})`;
  }

  if (clone.seoTitle) clone.seoTitle = replaceModelRefs(source.seoTitle, target);
  if (clone.seoDescription) clone.seoDescription = replaceModelRefs(source.seoDescription, target);

  clone.viewCount = 0;
  clone.purchaseCount = 0;
  clone.reviews = [];
  clone.averageRating = 0;
  clone.totalReviews = 0;

  return clone;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const executeMode = process.argv.includes('--execute');

  console.log('=== VW Beetle → Caravelle T6 / Transporter T6 / Multivan T6 Duplication ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE (will insert into DB)' : 'DRY RUN (use --execute to insert)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  const sourceProducts = await Product.find({
    name: { $regex: /Beetle.*2011/i },
    'images.20': { $exists: true }
  }).lean();

  console.log(`Found ${sourceProducts.length} source Beetle 2011-2019 products (20+ images):`);
  for (const p of sourceProducts) {
    console.log(`  - ${p.name} [${p.sku}] (${p.images.length} images)`);
  }
  console.log();

  if (sourceProducts.length === 0) {
    console.log('No source products found. Exiting.');
    await mongoose.disconnect();
    return;
  }

  const allClones = [];
  for (const source of sourceProducts) {
    for (const target of TARGET_MODELS) {
      const clone = cloneProduct(source, target);
      if (clone) allClones.push(clone);
    }
  }

  console.log(`Generated ${allClones.length} new products (${sourceProducts.length} sources x ${TARGET_MODELS.length} models)\n`);

  // Check for existing duplicates
  const allSkus = allClones.map(p => p.sku);
  const existing = await Product.find({ sku: { $in: allSkus } }).lean();
  const existingSkus = new Set(existing.map(p => p.sku));

  const toInsert = [];
  let skippedCount = 0;
  for (const clone of allClones) {
    if (existingSkus.has(clone.sku)) {
      console.log(`  [SKIP] ${clone.name} [${clone.sku}] (already exists)`);
      skippedCount++;
      continue;
    }
    toInsert.push(clone);
  }

  if (skippedCount > 0) {
    console.log(`\n${skippedCount} products skipped (already exist)\n`);
  }

  console.log(`Products to insert: ${toInsert.length}\n`);
  for (const p of toInsert) {
    console.log(`  ${p.name}`);
    console.log(`    SKU: ${p.sku}`);
  }
  console.log();

  if (executeMode) {
    console.log('Inserting into database...');
    try {
      const result = await Product.insertMany(toInsert, { ordered: false });
      console.log(`Successfully inserted ${result.length} products.`);
    } catch (err) {
      if (err.name === 'BulkWriteError' || err.name === 'MongoBulkWriteError') {
        const inserted = err.insertedDocs?.length || err.result?.nInserted || 0;
        const writeErrors = err.writeErrors || err.result?.writeErrors || [];
        console.log(`Inserted ${inserted} products. ${writeErrors.length} failed due to conflicts.`);
        for (const we of writeErrors) {
          console.log(`  [ERROR] ${we.errmsg || we.err?.errmsg || JSON.stringify(we)}`);
        }
      } else {
        throw err;
      }
    }
  } else {
    console.log('DRY RUN complete. Run with --execute to insert products.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
