require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ─── Source: Opel Astra H 2004-2014, 7 inch ────────────────────────────────

const TARGET_MODELS = [
  { name: 'Corsa C', yearFrom: 2000, yearTo: 2006 },
  { name: 'Meriva', yearFrom: 2003, yearTo: 2010 },
  { name: 'Vectra C', yearFrom: 2002, yearTo: 2009 },
  { name: 'Antara', yearFrom: 2006, yearTo: 2017 },
  { name: 'Signum', yearFrom: 2003, yearTo: 2008 },
  { name: 'Vivaro', yearFrom: 2004, yearTo: 2014 },
  { name: 'Corsa D', yearFrom: 2006, yearTo: 2014 },
  { name: 'Zafira', yearFrom: 2005, yearTo: 2014 },
  { name: 'Tigra', yearFrom: 2004, yearTo: 2009 },
  { name: 'Combo', yearFrom: 2003, yearTo: 2011 },
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

// Match source SKU: (OPEL)?ASTRAH followed by digits
// e.g. "OPELASTRAH041472Q" → prefix "OPELASTRAH0414", remainder "72Q"
const SOURCE_SKU_REGEX = /^(OPEL)?(ASTRAH?)\d*/i;

function parseSourceSku(sku) {
  const match = sku.match(SOURCE_SKU_REGEX);
  if (!match) return null;
  const prefix = match[0];
  return { prefix, remainder: sku.substring(prefix.length), hadBrandPrefix: !!match[1] };
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
  const remainder = parsed.remainder;
  return 'OPEL' + modelPart + yearPart + '-' + remainder;
}

// Normalize "4 Core" → "4Core", "8 Core" → "8Core"
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

  // Replace full "Astra H 2004-2014" (most specific first)
  result = result.replace(/Astra\s*H\s+2004[\s–-]+2014/gi, targetFull);

  // Replace standalone "Astra H"
  result = result.replace(/\bAstra\s*H\b/gi, target.name);

  // Normalize cores
  result = normalizeCores(result);

  return result;
}

// ─── Clone a single product for a target model ──────────────────────────────

function cloneProduct(source, target) {
  let newName = source.name;

  // Replace "Astra H 2004-2014" with target
  const astraHYearRegex = /Astra\s*H\s+2004[\s–-]+2014/i;
  if (astraHYearRegex.test(newName)) {
    newName = newName.replace(astraHYearRegex, `${target.name} ${target.yearFrom}-${target.yearTo}`);
  }

  // Normalize cores in name
  newName = normalizeCores(newName);

  const newSlug = generateSlug(newName);

  const parsed = parseSourceSku(source.sku);
  if (!parsed) {
    console.log(`  [WARN] SKU "${source.sku}" doesn't match any known Astra H prefix, skipping for ${target.name}`);
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
  clone.brand = 'Opel';

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
    brand: 'Opel',
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
      clone.romanianSpecs.compatibility.marca = 'Opel';
    }
  }
  if (clone.romanianSpecs?.general) {
    if (clone.romanianSpecs.general.sku) {
      clone.romanianSpecs.general.sku = newSku;
    }
    if (clone.romanianSpecs.general.brand) {
      clone.romanianSpecs.general.brand = 'Opel';
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

  console.log('=== Opel Astra H 2004-2014 (7 inch) → Opel Models Duplication ===');
  console.log(`Targets: ${TARGET_MODELS.length} Opel models`);
  console.log(`Mode: ${executeMode ? 'EXECUTE (will insert into DB)' : 'DRY RUN (use --execute to insert)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  // 1. Find source Astra H 2004-2014 7 inch products with 20+ images
  const sourceProducts = await Product.find({
    $and: [
      { name: { $regex: /Astra\s*H.*2004/i } },
      { name: { $regex: /7\s*inch/i } }
    ],
    'images.20': { $exists: true }
  }).lean();

  console.log(`Found ${sourceProducts.length} source Astra H 2004-2014 7 inch products (20+ images):`);
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
  console.log();

  if (toInsert.length === 0) {
    console.log('Nothing new to insert. All products already exist.');
    await mongoose.disconnect();
    return;
  }

  // Print samples
  console.log('Sample new products:');
  const samples = toInsert.slice(0, 6);
  for (const s of samples) {
    console.log(`  ${s.name} [${s.sku}]`);
    console.log(`    slug: ${s.slug}`);
    console.log(`    categorii: ${s.romanianSpecs?.general?.categorii || 'N/A'}`);
  }
  if (toInsert.length > 6) console.log(`  ... and ${toInsert.length - 6} more`);
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
