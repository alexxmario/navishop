require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// The 6 SKUs that failed due to slug conflicts
const FAILED_SKUS = [
  'VWCRVT6152272Q',
  'VWTRT6152272Q',
  'VWMLVT6152072Q',
  'CRVT61522-LMQ8470GPS',
  'TRT61522-LMQ8470GPS',
  'MLVT61520-LMQ8470GPS',
];

// The conflicting slugs — we'll append "-po" to make them unique
const SLUG_FIXES = {
  'navigatie-piloton-vw-caravelle-t6-2015-2022-7-inch-2gb-32gb-4-core': 'navigatie-piloton-vw-caravelle-t6-2015-2022-7-inch-2gb-32gb-4-core-po',
  'navigatie-piloton-vw-transporter-t6-2015-2022-7-inch-2gb-32gb-4-core': 'navigatie-piloton-vw-transporter-t6-2015-2022-7-inch-2gb-32gb-4-core-po',
  'navigatie-piloton-vw-multivan-t6-2015-2020-7-inch-2gb-32gb-4-core': 'navigatie-piloton-vw-multivan-t6-2015-2020-7-inch-2gb-32gb-4-core-po',
  'navigatie-piloton-vw-caravelle-t6-2015-2022-9-inch-qled-4gb-64gb-8-core-4g': 'navigatie-piloton-vw-caravelle-t6-2015-2022-9-inch-qled-4gb-64gb-8-core-4g-po',
  'navigatie-piloton-vw-transporter-t6-2015-2022-9-inch-qled-4gb-64gb-8-core-4g': 'navigatie-piloton-vw-transporter-t6-2015-2022-9-inch-qled-4gb-64gb-8-core-4g-po',
  'navigatie-piloton-vw-multivan-t6-2015-2020-9-inch-qled-4gb-64gb-8-core-4g': 'navigatie-piloton-vw-multivan-t6-2015-2020-9-inch-qled-4gb-64gb-8-core-4g-po',
};

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

function replaceModelRefs(text, target) {
  if (!text) return text;
  const targetFull = `${target.name} ${target.yearFrom}-${target.yearTo}`;
  let result = text.replace(/Beetle\s+2011[\s–-]+2019/gi, targetFull);
  result = result.replace(/\bBeetle\b/gi, target.name);
  return result;
}

// Map SKU to its target model info
const SKU_TO_TARGET = {
  'VWCRVT6152272Q': { name: 'Caravelle T6', yearFrom: 2015, yearTo: 2022, skuPrefix: 'CRVT6', sourceRemainder: '72Q' },
  'VWTRT6152272Q': { name: 'Transporter T6', yearFrom: 2015, yearTo: 2022, skuPrefix: 'TRT6', sourceRemainder: '72Q' },
  'VWMLVT6152072Q': { name: 'Multivan T6', yearFrom: 2015, yearTo: 2020, skuPrefix: 'MLVT6', sourceRemainder: '72Q' },
  'CRVT61522-LMQ8470GPS': { name: 'Caravelle T6', yearFrom: 2015, yearTo: 2022, skuPrefix: 'CRVT6', sourceRemainder: '-LMQ8470GPS' },
  'TRT61522-LMQ8470GPS': { name: 'Transporter T6', yearFrom: 2015, yearTo: 2022, skuPrefix: 'TRT6', sourceRemainder: '-LMQ8470GPS' },
  'MLVT61520-LMQ8470GPS': { name: 'Multivan T6', yearFrom: 2015, yearTo: 2020, skuPrefix: 'MLVT6', sourceRemainder: '-LMQ8470GPS' },
};

// Source Beetle SKUs that map to the failed ones
const SOURCE_BEETLE_SKUS = ['VWBEETLE111972Q', 'BEETLE1119-LMQ8470GPS'];

async function main() {
  const executeMode = process.argv.includes('--execute');

  console.log('=== Fix 6 T6 products with slug conflicts ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE' : 'DRY RUN (use --execute to insert)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  // Find the source Beetle products
  const sourceProducts = await Product.find({ sku: { $in: SOURCE_BEETLE_SKUS } }).lean();
  console.log(`Found ${sourceProducts.length} source Beetle products:`);
  for (const p of sourceProducts) {
    console.log(`  - ${p.name} [${p.sku}]`);
  }
  console.log();

  const sourceByPrefix = {};
  for (const p of sourceProducts) {
    if (p.sku === 'VWBEETLE111972Q') sourceByPrefix['72Q'] = p;
    if (p.sku === 'BEETLE1119-LMQ8470GPS') sourceByPrefix['-LMQ8470GPS'] = p;
  }

  const toInsert = [];

  for (const [newSku, target] of Object.entries(SKU_TO_TARGET)) {
    const source = sourceByPrefix[target.sourceRemainder];
    if (!source) {
      console.log(`  [SKIP] No source found for ${newSku}`);
      continue;
    }

    const clone = JSON.parse(JSON.stringify(source));
    delete clone._id;
    delete clone.__v;
    delete clone.createdAt;
    delete clone.updatedAt;

    clone.name = source.name.replace(
      /Beetle\s+2011[\s–-]+2019/i,
      `${target.name} ${target.yearFrom}-${target.yearTo}`
    );

    const baseSlug = generateSlug(clone.name);
    clone.slug = SLUG_FIXES[baseSlug] || baseSlug + '-po';
    clone.sku = newSku;
    clone.model = target.name;

    clone.description = replaceModelRefs(source.description, target);
    if (clone.shortDescription) clone.shortDescription = replaceModelRefs(source.shortDescription, target);

    if (clone.structuredDescription?.sections) {
      clone.structuredDescription.sections = clone.structuredDescription.sections.map(section => ({
        ...section,
        title: replaceModelRefs(section.title, target),
        points: section.points?.map(p => replaceModelRefs(p, target)) || []
      }));
      if (clone.structuredDescription.originalDescription) {
        clone.structuredDescription.originalDescription = replaceModelRefs(clone.structuredDescription.originalDescription, target);
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
      years: Array.from({ length: target.yearTo - target.yearFrom + 1 }, (_, i) => target.yearFrom + i)
    }];

    if (clone.romanianSpecs?.compatibility?.destinatPentru) {
      clone.romanianSpecs.compatibility.destinatPentru = replaceModelRefs(clone.romanianSpecs.compatibility.destinatPentru, target);
    }
    if (clone.romanianSpecs?.general?.sku) clone.romanianSpecs.general.sku = newSku;
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

    toInsert.push(clone);
    console.log(`  ${clone.name}`);
    console.log(`    SKU: ${clone.sku}`);
    console.log(`    Slug: ${clone.slug}`);
  }

  console.log(`\nProducts to insert: ${toInsert.length}\n`);

  if (executeMode) {
    console.log('Inserting into database...');
    const result = await Product.insertMany(toInsert);
    console.log(`Successfully inserted ${result.length} products.`);
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
