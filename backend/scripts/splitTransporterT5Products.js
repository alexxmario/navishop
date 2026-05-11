require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// ─── Source SKUs to split ────────────────────────────────────────────────────
const SOURCE_SKUS = [
  'TRANSPORTERT503158GB2KPO',
  'TRANSPORTERT503154GB2KPO',
  'TRANSPORTERT503156GBOPO',
  'TRANSPORTERT503154GBOPO',
  'TRANSPORTERT503154GBQPO',
  'TRANSPORTERT503152GBQPO',
];

const OLD_YEAR_RANGE = '2003-2015';
const OLD_YEAR_PART = '0315';

const SPLIT_RANGES = [
  { yearFrom: 2003, yearTo: 2009, yearPart: '0309' },
  { yearFrom: 2010, yearTo: 2015, yearPart: '1015' },
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

function replaceYearRange(text, range) {
  if (!text) return text;
  return text.replace(/2003[\s–-]+2015/g, `${range.yearFrom}-${range.yearTo}`);
}

function cloneForRange(source, range) {
  const clone = JSON.parse(JSON.stringify(source));

  delete clone._id;
  delete clone.__v;
  delete clone.createdAt;
  delete clone.updatedAt;

  // Update name
  clone.name = replaceYearRange(source.name, range);
  clone.slug = generateSlug(clone.name);

  // Update SKU: replace year part 0315 → 0309 or 1015
  clone.sku = source.sku.replace(OLD_YEAR_PART, range.yearPart);

  // Update description fields
  clone.description = replaceYearRange(source.description, range);
  if (clone.shortDescription) {
    clone.shortDescription = replaceYearRange(source.shortDescription, range);
  }

  // Update structured description
  if (clone.structuredDescription?.sections) {
    clone.structuredDescription.sections = clone.structuredDescription.sections.map(section => ({
      ...section,
      title: replaceYearRange(section.title, range),
      points: section.points?.map(p => replaceYearRange(p, range)) || []
    }));
    if (clone.structuredDescription.originalDescription) {
      clone.structuredDescription.originalDescription = replaceYearRange(
        clone.structuredDescription.originalDescription, range
      );
    }
    clone.structuredDescription.parsedAt = new Date();
  }

  // Update image alt texts
  clone.images = source.images.map(img => ({
    url: img.url,
    alt: replaceYearRange(img.alt, range),
    isPrimary: img.isPrimary
  }));

  // Update compatibility
  if (clone.compatibility) {
    clone.compatibility = clone.compatibility.map(c => ({
      ...c,
      yearFrom: range.yearFrom,
      yearTo: range.yearTo,
      years: Array.from(
        { length: range.yearTo - range.yearFrom + 1 },
        (_, i) => range.yearFrom + i
      )
    }));
  }

  // Update Romanian specs
  if (clone.romanianSpecs?.compatibility?.destinatPentru) {
    clone.romanianSpecs.compatibility.destinatPentru = replaceYearRange(
      clone.romanianSpecs.compatibility.destinatPentru, range
    );
  }
  if (clone.romanianSpecs?.general?.sku) {
    clone.romanianSpecs.general.sku = clone.sku;
  }
  if (clone.romanianSpecs?.general?.categorii) {
    clone.romanianSpecs.general.categorii = replaceYearRange(
      clone.romanianSpecs.general.categorii, range
    );
  }

  // Update SEO fields
  if (clone.seoTitle) clone.seoTitle = replaceYearRange(source.seoTitle, range);
  if (clone.seoDescription) clone.seoDescription = replaceYearRange(source.seoDescription, range);

  // Reset stats
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
  const deleteOriginals = process.argv.includes('--delete-originals');

  console.log('=== Split Transporter T5 2003-2015 → 2003-2009 + 2010-2015 ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE (will insert into DB)' : 'DRY RUN (use --execute to insert)'}`);
  if (deleteOriginals) console.log('Will DELETE original 2003-2015 products after inserting splits.');
  console.log();

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  const sourceProducts = await Product.find({ sku: { $in: SOURCE_SKUS } }).lean();

  console.log(`Found ${sourceProducts.length} of ${SOURCE_SKUS.length} source products:`);
  for (const p of sourceProducts) {
    console.log(`  - ${p.name} [${p.sku}]`);
  }
  console.log();

  if (sourceProducts.length === 0) {
    console.log('No source products found. Exiting.');
    await mongoose.disconnect();
    return;
  }

  const allClones = [];
  for (const source of sourceProducts) {
    for (const range of SPLIT_RANGES) {
      const clone = cloneForRange(source, range);
      allClones.push(clone);
    }
  }

  console.log(`Generated ${allClones.length} new products:\n`);
  for (const p of allClones) {
    console.log(`  ${p.name}`);
    console.log(`    SKU: ${p.sku}`);
  }
  console.log();

  if (executeMode) {
    // Check for existing SKUs to avoid duplicates
    const newSkus = allClones.map(c => c.sku);
    const existing = await Product.find({ sku: { $in: newSkus } }).lean();
    if (existing.length > 0) {
      console.log('WARNING: The following SKUs already exist:');
      for (const e of existing) {
        console.log(`  - ${e.name} [${e.sku}]`);
      }
      console.log('Skipping those SKUs.\n');
      const existingSkus = new Set(existing.map(e => e.sku));
      const toInsert = allClones.filter(c => !existingSkus.has(c.sku));
      if (toInsert.length === 0) {
        console.log('Nothing new to insert.');
      } else {
        const result = await Product.insertMany(toInsert);
        console.log(`Successfully inserted ${result.length} products.`);
      }
    } else {
      const result = await Product.insertMany(allClones);
      console.log(`Successfully inserted ${result.length} products.`);
    }

    if (deleteOriginals) {
      console.log('\nDeleting original 2003-2015 products...');
      const deleteResult = await Product.deleteMany({ sku: { $in: SOURCE_SKUS } });
      console.log(`Deleted ${deleteResult.deletedCount} original products.`);
    }
  } else {
    console.log('DRY RUN complete. Run with --execute to insert products.');
    if (!deleteOriginals) {
      console.log('Add --delete-originals to also remove the original 2003-2015 products.');
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
