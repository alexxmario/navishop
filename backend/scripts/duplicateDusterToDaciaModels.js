require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ─── Source SKUs (Dacia Duster 2014-2018) ───────────────────────────────────
const SOURCE_SKUS = [
  'DUSTER1418128GB7INCH',
  'DUSTER141864GB7INCH',
  'DUSTER14184GB7INCH',
];

// ─── Target models ──────────────────────────────────────────────────────────
const TARGET_MODELS = [
  { name: 'Sandero', yearFrom: 2012, yearTo: 2020, skuPrefix: 'SANDERO' },
  { name: 'Logan', yearFrom: 2012, yearTo: 2020, skuPrefix: 'LOGAN' },
  { name: 'Dokker', yearFrom: 2012, yearTo: 2020, skuPrefix: 'DOKKER' },
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

function randomLetters(n = 2) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < n; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function buildSkuYearPart(yearFrom, yearTo) {
  return String(yearFrom).slice(2) + String(yearTo).slice(2);
}

function buildNewSku(oldSku, target) {
  // Replace DUSTER1418 with target prefix + year part
  const remainder = oldSku.replace(/^DUSTER1418/, '');
  return target.skuPrefix + buildSkuYearPart(target.yearFrom, target.yearTo) + remainder;
}

function replaceModelRefs(text, target) {
  if (!text) return text;
  const targetFull = `${target.name} ${target.yearFrom}-${target.yearTo}`;
  // Replace "Duster 2014-2018" (with various separators)
  let result = text.replace(/Duster\s+2014[\s–-]+2018/gi, targetFull);
  // Replace standalone "Duster"
  result = result.replace(/\bDuster\b/gi, target.name);
  return result;
}

// ─── Clone a single product ─────────────────────────────────────────────────

function cloneProduct(source, target) {
  let newName = replaceModelRefs(source.name, target);
  // Normalize "4 Core" → "4Core", "8 Core" → "8Core"
  newName = newName.replace(/(\d)\s+Core/g, '$1Core');
  const newSlug = generateSlug(newName);
  const newSku = buildNewSku(source.sku, target);

  const clone = JSON.parse(JSON.stringify(source));

  delete clone._id;
  delete clone.__v;
  delete clone.createdAt;
  delete clone.updatedAt;

  clone.name = newName;
  clone.slug = newSlug;
  clone.sku = newSku;
  clone.model = target.name;
  clone.brand = 'Dacia';

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
    brand: 'Dacia',
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

  console.log('=== Dacia Duster 2014-2018 → Sandero / Logan / Dokker 2012-2020 Duplication ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE (will insert into DB)' : 'DRY RUN (use --execute to insert)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  const sourceProducts = await Product.find({
    sku: { $in: SOURCE_SKUS }
  }).lean();

  console.log(`Found ${sourceProducts.length} source Duster products:`);
  for (const p of sourceProducts) {
    console.log(`  - ${p.name} [${p.sku}] (${p.images?.length || 0} images)`);
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

  // Check for existing duplicates by SKU and slug
  const allSkus = allClones.map(p => p.sku);
  const allSlugs = allClones.map(p => p.slug);
  const existingBySku = await Product.find({ sku: { $in: allSkus } }).lean();
  const existingBySlug = await Product.find({ slug: { $in: allSlugs } }).lean();
  const existingSkus = new Set(existingBySku.map(p => p.sku));
  const usedSlugs = new Set(existingBySlug.map(p => p.slug));

  const batchSlugs = new Set();
  const batchSkus = new Set();

  const toInsert = [];
  let skippedCount = 0;
  for (const clone of allClones) {
    if (existingSkus.has(clone.sku) || batchSkus.has(clone.sku)) {
      console.log(`  [SKIP] ${clone.name} [${clone.sku}] (SKU already exists)`);
      skippedCount++;
      continue;
    }

    // Resolve slug conflicts
    if (usedSlugs.has(clone.slug) || batchSlugs.has(clone.slug)) {
      const oldSlug = clone.slug;
      clone.slug = clone.slug + '-' + randomLetters(2);
      console.log(`  [SLUG FIX] ${oldSlug} → ${clone.slug}`);
    }

    batchSlugs.add(clone.slug);
    batchSkus.add(clone.sku);
    toInsert.push(clone);
  }

  if (skippedCount > 0) {
    console.log(`\n${skippedCount} products skipped (already exist)\n`);
  }

  console.log(`\nProducts to insert: ${toInsert.length}\n`);
  for (const p of toInsert) {
    console.log(`  ${p.name}`);
    console.log(`    SKU:  ${p.sku}`);
    console.log(`    Slug: ${p.slug}`);
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
