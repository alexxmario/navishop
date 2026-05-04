require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ─── Target models to clone Beetle products into ────────────────────────────
const TARGET_MODELS = [
  { name: 'Amarok', yearFrom: 2010, yearTo: 2022 },
  { name: 'Jetta', yearFrom: 2004, yearTo: 2011 },
  { name: 'Caddy 3', yearFrom: 2004, yearTo: 2015 },
  { name: 'EOS', yearFrom: 2006, yearTo: 2013 },
  { name: 'Golf 5', yearFrom: 2003, yearTo: 2010 },
  { name: 'Golf 6', yearFrom: 2008, yearTo: 2014 },
  { name: 'Golf Plus', yearFrom: 2004, yearTo: 2014 },
  { name: 'Jetta', yearFrom: 2011, yearTo: 2018 },
  { name: 'Passat B6', yearFrom: 2005, yearTo: 2010 },
  { name: 'Passat B7', yearFrom: 2010, yearTo: 2014 },
  { name: 'Passat CC', yearFrom: 2008, yearTo: 2012 },
  { name: 'Polo 6R', yearFrom: 2009, yearTo: 2018 },
  { name: 'Scirocco', yearFrom: 2008, yearTo: 2018 },
  { name: 'Touran', yearFrom: 2003, yearTo: 2013 },
  { name: 'Tiguan', yearFrom: 2007, yearTo: 2018 },
  { name: 'T5 Multivan', yearFrom: 2010, yearTo: 2015 },
  { name: 'T5 Transporter', yearFrom: 2010, yearTo: 2015 },
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

// Both prefixes found in the DB: "BEETLE1119..." and "VWBEETLE1119..."
const SOURCE_SKU_PREFIXES = ['VWBEETLE1119', 'BEETLE1119'];

function parseSourceSku(sku) {
  for (const prefix of SOURCE_SKU_PREFIXES) {
    if (sku.startsWith(prefix)) {
      return { prefix, remainder: sku.substring(prefix.length) };
    }
  }
  return null;
}

function buildSkuModelPart(modelName) {
  return modelName.toUpperCase().replace(/\s+/g, '');
}

function buildSkuYearPart(yearFrom, yearTo) {
  return String(yearFrom).slice(2) + String(yearTo).slice(2);
}

function buildNewSku(parsed, target) {
  // Keep the VW prefix if the source had it
  const vwPrefix = parsed.prefix.startsWith('VW') ? 'VW' : '';
  return vwPrefix + buildSkuModelPart(target.name) + buildSkuYearPart(target.yearFrom, target.yearTo) + parsed.remainder;
}

function replaceModelRefs(text, target) {
  if (!text) return text;
  const targetFull = `${target.name} ${target.yearFrom}-${target.yearTo}`;
  // Replace full "Beetle 2011-2019" first (more specific)
  let result = text.replace(/Beetle\s+2011[\s–-]+2019/gi, targetFull);
  // Then standalone "Beetle"
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

  // Deep clone via JSON round-trip
  const clone = JSON.parse(JSON.stringify(source));

  // Remove MongoDB metadata
  delete clone._id;
  delete clone.__v;
  delete clone.createdAt;
  delete clone.updatedAt;

  // Set new identifiers
  clone.name = newName;
  clone.slug = newSlug;
  clone.sku = newSku;
  clone.model = target.name;

  // Update text fields
  clone.description = replaceModelRefs(source.description, target);
  if (clone.shortDescription) {
    clone.shortDescription = replaceModelRefs(source.shortDescription, target);
  }

  // Update structured description
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

  // Update image alt texts (keep URLs)
  clone.images = source.images.map(img => ({
    url: img.url,
    alt: replaceModelRefs(img.alt, target),
    isPrimary: img.isPrimary
  }));

  // Update compatibility
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

  // Update romanianSpecs
  if (clone.romanianSpecs?.compatibility?.destinatPentru) {
    clone.romanianSpecs.compatibility.destinatPentru = replaceModelRefs(
      clone.romanianSpecs.compatibility.destinatPentru, target
    );
  }
  if (clone.romanianSpecs?.general?.sku) {
    clone.romanianSpecs.general.sku = newSku;
  }

  // Update SEO fields
  if (clone.seoTitle) clone.seoTitle = replaceModelRefs(source.seoTitle, target);
  if (clone.seoDescription) clone.seoDescription = replaceModelRefs(source.seoDescription, target);

  // Reset counters
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

  console.log('=== VW Beetle Product Duplication ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE (will insert into DB)' : 'DRY RUN (use --execute to insert)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  // 1. Find source Beetle 2011-2019 products with 20+ images
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

  // 2. Generate all cloned products
  const allClones = [];
  for (const source of sourceProducts) {
    for (const target of TARGET_MODELS) {
      const clone = cloneProduct(source, target);
      if (clone) allClones.push(clone);
    }
  }

  console.log(`Generated ${allClones.length} new products (${sourceProducts.length} sources x ${TARGET_MODELS.length} models)\n`);

  // 3. Check for existing duplicates by name, slug, or SKU
  const allNames = allClones.map(p => p.name);
  const allSlugs = allClones.map(p => p.slug);
  const allSkus = allClones.map(p => p.sku);

  const existing = await Product.find({
    $or: [
      { name: { $in: allNames } },
      { slug: { $in: allSlugs } },
      { sku: { $in: allSkus } }
    ]
  }).lean();

  const existingNames = new Set(existing.map(p => p.name));
  const existingSlugs = new Set(existing.map(p => p.slug));
  const existingSkus = new Set(existing.map(p => p.sku));

  const toInsert = [];
  let skippedCount = 0;
  for (const clone of allClones) {
    const nameConflict = existingNames.has(clone.name);
    const slugConflict = existingSlugs.has(clone.slug);
    const skuConflict = existingSkus.has(clone.sku);

    if (nameConflict || slugConflict || skuConflict) {
      const reasons = [];
      if (nameConflict) reasons.push('name');
      if (slugConflict) reasons.push('slug');
      if (skuConflict) reasons.push('sku');

      console.log(`  [SKIP] ${clone.name} (already exists: ${reasons.join(', ')})`);
      skippedCount++;
    } else {
      toInsert.push(clone);
    }
  }

  if (skippedCount > 0) {
    console.log(`\n${skippedCount} products already exist and were skipped\n`);
  }

  // 4. Print summary
  console.log('--- Summary ---');
  console.log(`  Source products: ${sourceProducts.length}`);
  console.log(`  Generated: ${allClones.length}`);
  console.log(`  Skipped (already exist): ${skippedCount}`);
  console.log(`  To insert: ${toInsert.length}`);
  console.log();

  if (toInsert.length === 0) {
    console.log('\nNothing new to insert. All products already exist.');
    await mongoose.disconnect();
    return;
  }

  // Print a few sample SKUs
  console.log('\nSample new products:');
  const samples = toInsert.slice(0, 5);
  for (const s of samples) {
    console.log(`  ${s.name} [${s.sku}]`);
  }
  if (toInsert.length > 5) console.log(`  ... and ${toInsert.length - 5} more`);
  console.log();

  // 5. Insert if --execute
  if (executeMode) {
    console.log('Inserting into database...');
    try {
      const result = await Product.insertMany(toInsert, { ordered: false });
      console.log(`Successfully inserted ${result.length} products.`);
    } catch (err) {
      if (err.name === 'BulkWriteError' || err.name === 'MongoBulkWriteError') {
        const inserted = err.insertedDocs?.length || err.result?.nInserted || 0;
        console.log(`Inserted ${inserted} products. ${err.writeErrors?.length || 0} failed due to conflicts.`);
        for (const we of (err.writeErrors || [])) {
          console.log(`  [ERROR] ${we.errmsg}`);
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
