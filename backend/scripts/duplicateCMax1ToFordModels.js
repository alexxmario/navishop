require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ─── Source SKUs (Ford C MAX 1 2003-2010 SILVER) ────────────────────────────
const SOURCE_SKUS = [
  'CMAX103101QSQUARE-SILVER',
  'CMAX103102QSQUARE-SILVER',
  'CMAX103104OSQUARE-SILVER',
  'CMAX2151Q2GB32-4648-SILVER',
];

// ─── Target models ──────────────────────────────────────────────────────────
const TARGET_MODELS = [
  { name: 'Transit', yearFrom: 2005, yearTo: 2014, skuPrefix: 'TRANSIT' },
  { name: 'Fiesta', yearFrom: 2002, yearTo: 2008, skuPrefix: 'FIESTA' },
  { name: 'Focus', yearFrom: 2004, yearTo: 2011, skuPrefix: 'FOCUS' },
  { name: 'Galaxy 2', yearFrom: 2006, yearTo: 2015, skuPrefix: 'GALAXY2' },
  { name: 'Mondeo', yearFrom: 2004, yearTo: 2007, skuPrefix: 'MONDEO3' },
  { name: 'Mondeo', yearFrom: 2007, yearTo: 2014, skuPrefix: 'MONDEO4' },
  { name: 'Fusion', yearFrom: 2002, yearTo: 2012, skuPrefix: 'FUSION' },
  { name: 'Kuga', yearFrom: 2008, yearTo: 2012, skuPrefix: 'KUGA' },
  { name: 'S-Max 1', yearFrom: 2006, yearTo: 2015, skuPrefix: 'SMAX1' },
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
  // Strip "CMAX" + "10310" (model 1 + year 0310) keeping variant digits
  // CMAX103101QSQUARE-SILVER → remainder: 1QSQUARE-SILVER
  // CMAX103102QSQUARE-SILVER → remainder: 2QSQUARE-SILVER
  // CMAX103104OSQUARE-SILVER → remainder: 4OSQUARE-SILVER
  // CMAX2151Q2GB32-4648-SILVER → remainder: 2151Q2GB32-4648-SILVER
  let remainder;
  if (oldSku.startsWith('CMAX10310')) {
    remainder = oldSku.substring('CMAX10310'.length);
  } else {
    remainder = oldSku.substring('CMAX'.length);
  }
  return target.skuPrefix + '-' + buildSkuYearPart(target.yearFrom, target.yearTo) + '-' + remainder;
}

function replaceModelRefs(text, target) {
  if (!text) return text;
  const targetFull = `${target.name} ${target.yearFrom}-${target.yearTo}`;
  // Replace "C MAX 1 2003-2010" or "C Max 1 2003-2010" (with various separators)
  let result = text.replace(/C[\s-]*Max\s*1\s+2003[\s–-]+2010/gi, targetFull);
  // Replace standalone "C MAX 1" or "C Max 1"
  result = result.replace(/C[\s-]*Max\s*1/gi, target.name);
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
  clone.brand = 'Ford';

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
    brand: 'Ford',
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

  console.log('=== Ford C MAX 1 2003-2010 → Multiple Ford Models Duplication ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE (will insert into DB)' : 'DRY RUN (use --execute to insert)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  const sourceProducts = await Product.find({
    sku: { $in: SOURCE_SKUS }
  }).lean();

  console.log(`Found ${sourceProducts.length} source C MAX 1 products:`);
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
