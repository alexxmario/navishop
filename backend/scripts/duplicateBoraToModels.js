require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ─── Source: VW Bora 1998-2006 ─────────────────────────────────────────────
const SOURCE_BRAND = 'Bora';
const SOURCE_YEAR_FROM = 1998;
const SOURCE_YEAR_TO = 2006;

// ─── Target models grouped by brand ────────────────────────────────────────

const VW_TARGETS = [
  { name: 'Passat B5.5', yearFrom: 2000, yearTo: 2005 },
  { name: 'Jetta', yearFrom: 1997, yearTo: 2005 },
  { name: 'Golf IV', yearFrom: 1997, yearTo: 2003 },
  { name: 'Sharan', yearFrom: 1998, yearTo: 2009 },
  { name: 'Lupo', yearFrom: 1998, yearTo: 2005 },
  { name: 'Polo', yearFrom: 1997, yearTo: 2001 },
  { name: 'Polo 9n', yearFrom: 2001, yearTo: 2010 },
  { name: 'Multivan T5', yearFrom: 2003, yearTo: 2008 },
  { name: 'Transporter T4', yearFrom: 1998, yearTo: 2003 },
  { name: 'Transporter T5', yearFrom: 2003, yearTo: 2009 },
];

const SEAT_TARGETS = [
  { name: 'Alhambra', yearFrom: 1996, yearTo: 2008 },
  { name: 'Ibiza', yearFrom: 2002, yearTo: 2008 },
  { name: 'Leon', yearFrom: 1999, yearTo: 2005 },
  { name: 'Cordoba', yearFrom: 2002, yearTo: 2008 },
  { name: 'Toledo', yearFrom: 1999, yearTo: 2004 },
  { name: 'Arosa', yearFrom: 1997, yearTo: 2004 },
];

const SKODA_TARGETS = [
  { name: 'Superb', yearFrom: 2001, yearTo: 2008 },
  { name: 'Octavia', yearFrom: 1997, yearTo: 2004 },
  { name: 'Fabia', yearFrom: 1999, yearTo: 2003 },
];

// Combine all targets with their brand info
const ALL_TARGETS = [
  ...VW_TARGETS.map(t => ({ ...t, brand: 'VW', skuPrefix: 'VW' })),
  ...SEAT_TARGETS.map(t => ({ ...t, brand: 'Seat', skuPrefix: 'SEAT' })),
  ...SKODA_TARGETS.map(t => ({ ...t, brand: 'Skoda', skuPrefix: 'SKODA' })),
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

// Detect all possible Bora SKU prefixes
const SOURCE_SKU_PREFIXES = ['VWBORA9806', 'BORA9806'];

function parseSourceSku(sku) {
  for (const prefix of SOURCE_SKU_PREFIXES) {
    if (sku.startsWith(prefix)) {
      return { prefix, remainder: sku.substring(prefix.length), hadVwPrefix: prefix.startsWith('VW') };
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
  const modelPart = buildSkuModelPart(target.name);
  const yearPart = buildSkuYearPart(target.yearFrom, target.yearTo);
  // Add extra dash separator between model-year and remainder for uniqueness
  const remainder = parsed.remainder;

  if (target.brand === 'VW') {
    const vwPrefix = parsed.hadVwPrefix ? 'VW' : '';
    return vwPrefix + modelPart + '-' + yearPart + '-' + remainder;
  }
  // For Seat/Skoda, use brand prefix
  return target.skuPrefix + '-' + modelPart + '-' + yearPart + '-' + remainder;
}

// Normalize "4 Core" → "4Core", "8 Core" → "8Core" to avoid conflicts
function normalizeCores(text) {
  if (!text) return text;
  return text
    .replace(/\b4\s+Core\b/g, '4Core')
    .replace(/\b8\s+Core\b/g, '8Core')
    .replace(/\b4\s+core\b/g, '4core')
    .replace(/\b8\s+core\b/g, '8core');
}

function replaceModelRefs(text, target) {
  if (!text) return text;
  const targetFull = `${target.name} ${target.yearFrom}-${target.yearTo}`;

  let result = text;

  // Replace "VW Bora 1998-2006" with appropriate brand + model
  result = result.replace(/VW\s+Bora\s+1998[\s–-]+2006/gi, `${target.brand} ${targetFull}`);
  result = result.replace(/Volkswagen\s+Bora\s+1998[\s–-]+2006/gi, `${target.brand} ${targetFull}`);
  result = result.replace(/Bora\s+1998[\s–-]+2006/gi, `${target.brand === 'VW' ? '' : target.brand + ' '}${targetFull}`);

  // Replace standalone brand+model references
  result = result.replace(/\bVW\s+Bora\b/gi, `${target.brand} ${target.name}`);
  result = result.replace(/\bVolkswagen\s+Bora\b/gi, `${target.brand} ${target.name}`);

  // Replace standalone "Bora"
  result = result.replace(/\bBora\b/gi, target.name);

  // For non-VW brands, replace remaining VW/Volkswagen references
  if (target.brand !== 'VW') {
    result = result.replace(/\bVolkswagen\b/gi, target.brand);
    result = result.replace(/\bVW\b/g, target.brand);
  }

  // Normalize cores
  result = normalizeCores(result);

  return result;
}

// ─── Clone a single product for a target model ──────────────────────────────

function cloneProduct(source, target) {
  // Build new name
  let newName = source.name;

  // Try "VW Bora 1998-2006" first
  const vwBoraYearRegex = /VW\s+Bora\s+1998[\s–-]+2006/i;
  const boraYearRegex = /Bora\s+1998[\s–-]+2006/i;

  if (vwBoraYearRegex.test(newName)) {
    newName = newName.replace(vwBoraYearRegex, `${target.brand} ${target.name} ${target.yearFrom}-${target.yearTo}`);
  } else if (boraYearRegex.test(newName)) {
    const prefix = target.brand === 'VW' ? '' : target.brand + ' ';
    newName = newName.replace(boraYearRegex, `${prefix}${target.name} ${target.yearFrom}-${target.yearTo}`);
  }

  // Normalize cores in name
  newName = normalizeCores(newName);

  const newSlug = generateSlug(newName);

  const parsed = parseSourceSku(source.sku);
  if (!parsed) {
    console.log(`  [WARN] SKU "${source.sku}" doesn't match any known Bora prefix, skipping for ${target.name}`);
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
  clone.brand = target.brand;

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
    brand: target.brand,
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
  if (clone.romanianSpecs?.compatibility) {
    if (clone.romanianSpecs.compatibility.destinatPentru) {
      clone.romanianSpecs.compatibility.destinatPentru = replaceModelRefs(
        clone.romanianSpecs.compatibility.destinatPentru, target
      );
    }
    if (clone.romanianSpecs.compatibility.marca) {
      clone.romanianSpecs.compatibility.marca = target.brand;
    }
  }
  if (clone.romanianSpecs?.general) {
    if (clone.romanianSpecs.general.sku) {
      clone.romanianSpecs.general.sku = newSku;
    }
    if (clone.romanianSpecs.general.brand) {
      clone.romanianSpecs.general.brand = target.brand;
    }
    if (clone.romanianSpecs.general.categorii) {
      clone.romanianSpecs.general.categorii = `${target.name} (${target.yearFrom}-${target.yearTo})`;
    }
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

  console.log('=== VW Bora 1998-2006 → Multi-Brand Product Duplication ===');
  console.log(`Targets: ${VW_TARGETS.length} VW, ${SEAT_TARGETS.length} Seat, ${SKODA_TARGETS.length} Skoda (${ALL_TARGETS.length} total)`);
  console.log(`Mode: ${executeMode ? 'EXECUTE (will insert into DB)' : 'DRY RUN (use --execute to insert)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  // 1. Find source Bora 1998-2006 products with 20+ images
  const sourceProducts = await Product.find({
    name: { $regex: /Bora.*1998/i },
    'images.20': { $exists: true }
  }).lean();

  console.log(`Found ${sourceProducts.length} source Bora 1998-2006 products (20+ images):`);
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
    for (const target of ALL_TARGETS) {
      const clone = cloneProduct(source, target);
      if (clone) allClones.push(clone);
    }
  }

  console.log(`Generated ${allClones.length} new products (${sourceProducts.length} sources x ${ALL_TARGETS.length} models)\n`);

  // 3. Duplicate/conflict detection
  const allNames = allClones.map(p => p.name);
  const allSlugs = allClones.map(p => p.slug);
  const allSkus = allClones.map(p => p.sku);
  const allCheckNames = allClones.map(p => p.name + ' CHECK');
  const allCheckSlugs = allClones.map(p => p.slug + '-check');
  const allCheckSkus = allClones.map(p => p.sku + '-CHECK');

  const existing = await Product.find({
    $or: [
      { name: { $in: [...allNames, ...allCheckNames] } },
      { slug: { $in: [...allSlugs, ...allCheckSlugs] } },
      { sku: { $in: [...allSkus, ...allCheckSkus] } }
    ]
  }).lean();

  const existingNames = new Set(existing.map(p => p.name));
  const existingSlugs = new Set(existing.map(p => p.slug));
  const existingSkus = new Set(existing.map(p => p.sku));

  const existingByName = {};
  const existingBySku = {};
  for (const p of existing) {
    existingByName[p.name] = p;
    existingBySku[p.sku] = p;
  }

  // Track intra-batch collisions
  const batchNames = new Set();
  const batchSlugs = new Set();
  const batchSkus = new Set();
  const batchByName = {};
  const batchBySku = {};

  const toInsert = [];
  let skippedCount = 0;
  let checkCount = 0;
  let skuFixCount = 0;

  for (const clone of allClones) {
    // Check if exact product or CHECK version already exists
    const alreadyInDb = (existingNames.has(clone.name) && existingSlugs.has(clone.slug) && existingSkus.has(clone.sku));
    const checkAlreadyInDb = (existingNames.has(clone.name + ' CHECK') || existingSlugs.has(clone.slug + '-check') || existingSkus.has(clone.sku + '-CHECK'));

    if (alreadyInDb || checkAlreadyInDb) {
      const reason = alreadyInDb ? 'exact duplicate' : 'CHECK version already exists';
      console.log(`  [SKIP] ${clone.name} [${clone.sku}] (${reason})`);
      skippedCount++;
      continue;
    }

    const nameConflictDb = existingNames.has(clone.name);
    const nameConflictBatch = batchNames.has(clone.name);
    const slugConflict = existingSlugs.has(clone.slug) || batchSlugs.has(clone.slug);
    const skuConflictDb = existingSkus.has(clone.sku);
    const skuConflictBatch = batchSkus.has(clone.sku);

    const nameConflict = nameConflictDb || nameConflictBatch;
    const skuConflict = skuConflictDb || skuConflictBatch;

    if (nameConflict || slugConflict || skuConflict) {
      if (skuConflict && !nameConflict && !slugConflict) {
        // Only SKU conflicts — auto-fix with -V2, -V3, etc.
        const oldSku = clone.sku;
        let suffix = 2;
        while (existingSkus.has(clone.sku) || batchSkus.has(clone.sku)) {
          clone.sku = oldSku + '-V' + suffix;
          suffix++;
        }
        if (clone.romanianSpecs?.general?.sku) {
          clone.romanianSpecs.general.sku = clone.sku;
        }
        console.log(`  [SKU FIX] ${clone.name} [${oldSku} -> ${clone.sku}]`);
        if (skuConflictDb) {
          const c = existingBySku[oldSku];
          console.log(`    -> DB sku was: "${c.name}" [${c.sku}]`);
        }
        if (skuConflictBatch) console.log(`    -> batch sku was: "${batchBySku[oldSku]?.name}"`);
        skuFixCount++;
      } else {
        // Name/slug conflict — mark with CHECK
        const reasons = [];
        if (nameConflict) reasons.push('name');
        if (slugConflict) reasons.push('slug');
        if (skuConflict) reasons.push('sku');

        console.log(`  [CHECK] ${clone.name} [${clone.sku}] (conflict: ${reasons.join(', ')})`);
        if (nameConflictDb) {
          const c = existingByName[clone.name];
          console.log(`    -> DB name match: "${c.name}" [${c.sku}]`);
        }
        if (nameConflictBatch) console.log(`    -> batch name match: "${batchByName[clone.name]?.sku}"`);
        if (skuConflictDb) {
          const c = existingBySku[clone.sku];
          console.log(`    -> DB sku match: "${c.name}" [${c.sku}]`);
        }
        if (skuConflictBatch) console.log(`    -> batch sku match: "${batchBySku[clone.sku]?.name}"`);

        clone.name = clone.name + ' CHECK';
        clone.slug = clone.slug + '-check';
        clone.sku = clone.sku + '-CHECK';

        // Check if CHECK version also conflicts
        if (existingNames.has(clone.name) || batchNames.has(clone.name) ||
            existingSlugs.has(clone.slug) || batchSlugs.has(clone.slug) ||
            existingSkus.has(clone.sku) || batchSkus.has(clone.sku)) {
          console.log(`    [SKIP] CHECK version also conflicts, skipping`);
          skippedCount++;
          continue;
        }
        checkCount++;
      }
    }

    batchNames.add(clone.name);
    batchSlugs.add(clone.slug);
    batchSkus.add(clone.sku);
    batchByName[clone.name] = clone;
    batchBySku[clone.sku] = clone;
    toInsert.push(clone);
  }

  // 4. Summary
  if (skippedCount > 0) {
    console.log(`\n${skippedCount} products skipped (already exist or CHECK version exists)`);
  }
  if (skuFixCount > 0) {
    console.log(`${skuFixCount} products had SKU tweaked (name/slug unique, only SKU conflicted)`);
  }
  if (checkCount > 0) {
    console.log(`${checkCount} products had name/slug conflicts and were marked with CHECK`);
  }

  console.log('\n--- Summary ---');
  console.log(`  Source products: ${sourceProducts.length}`);
  console.log(`  Generated: ${allClones.length}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  SKU fixed: ${skuFixCount}`);
  console.log(`  Marked CHECK: ${checkCount}`);
  console.log(`  To insert: ${toInsert.length}`);

  // Breakdown by brand
  const vwCount = toInsert.filter(p => p.brand === 'VW').length;
  const seatCount = toInsert.filter(p => p.brand === 'Seat').length;
  const skodaCount = toInsert.filter(p => p.brand === 'Skoda').length;
  console.log(`    VW: ${vwCount}, Seat: ${seatCount}, Skoda: ${skodaCount}`);
  console.log();

  if (toInsert.length === 0) {
    console.log('Nothing new to insert. All products already exist.');
    await mongoose.disconnect();
    return;
  }

  // Print samples per brand
  console.log('Sample new products:');
  for (const brandName of ['VW', 'Seat', 'Skoda']) {
    const brandProducts = toInsert.filter(p => p.brand === brandName);
    if (brandProducts.length > 0) {
      console.log(`\n  ${brandName}:`);
      const samples = brandProducts.slice(0, 3);
      for (const s of samples) {
        console.log(`    ${s.name} [${s.sku}]`);
        console.log(`      slug: ${s.slug}`);
        console.log(`      categorii: ${s.romanianSpecs?.general?.categorii || 'N/A'}`);
      }
      if (brandProducts.length > 3) console.log(`    ... and ${brandProducts.length - 3} more`);
    }
  }
  console.log();

  // 5. Insert if --execute
  if (executeMode) {
    console.log('Inserting into database...');
    try {
      const result = await Product.insertMany(toInsert, { ordered: false });
      console.log(`Successfully inserted ${result.length} products.`);
    } catch (err) {
      if (err.name === 'BulkWriteError' || err.name === 'MongoBulkWriteError') {
        const inserted = err.insertedDocs?.length || err.result?.nInserted || err.result?.result?.nInserted || 0;
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
