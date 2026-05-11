require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const generateSlug = (name = '') => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

function replaceT5Transporter(text) {
  if (!text) return text;
  return text.replace(/T5 Transporter/g, 'Transporter T5');
}

async function main() {
  const executeMode = process.argv.includes('--execute');

  console.log('=== Rename T5 Transporter → Transporter T5 ===');
  console.log(`Mode: ${executeMode ? 'EXECUTE (will update DB)' : 'DRY RUN (use --execute to update)'}\n`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  const products = await Product.find({
    name: { $regex: /T5 Transporter/i }
  });

  console.log(`Found ${products.length} products with "T5 Transporter" in the name:\n`);

  for (const p of products) {
    const newName = replaceT5Transporter(p.name);
    const newSlug = generateSlug(newName);
    const newModel = replaceT5Transporter(p.model);

    console.log(`  "${p.name}"`);
    console.log(`  → "${newName}"\n`);

    if (executeMode) {
      p.name = newName;
      p.model = newModel;

      if (p.description) p.description = replaceT5Transporter(p.description);
      if (p.shortDescription) p.shortDescription = replaceT5Transporter(p.shortDescription);
      if (p.seoTitle) p.seoTitle = replaceT5Transporter(p.seoTitle);
      if (p.seoDescription) p.seoDescription = replaceT5Transporter(p.seoDescription);

      if (p.structuredDescription?.sections) {
        p.structuredDescription.sections = p.structuredDescription.sections.map(section => ({
          ...section,
          title: replaceT5Transporter(section.title),
          points: section.points?.map(pt => replaceT5Transporter(pt)) || []
        }));
        if (p.structuredDescription.originalDescription) {
          p.structuredDescription.originalDescription = replaceT5Transporter(p.structuredDescription.originalDescription);
        }
      }

      if (p.images) {
        p.images = p.images.map(img => ({
          ...img.toObject ? img.toObject() : img,
          alt: replaceT5Transporter(img.alt)
        }));
      }

      if (p.compatibility) {
        p.compatibility = p.compatibility.map(c => ({
          ...c.toObject ? c.toObject() : c,
          model: replaceT5Transporter(c.model),
          models: c.models?.map(m => replaceT5Transporter(m)) || []
        }));
      }

      if (p.romanianSpecs?.compatibility?.destinatPentru) {
        p.romanianSpecs.compatibility.destinatPentru = replaceT5Transporter(p.romanianSpecs.compatibility.destinatPentru);
      }
      if (p.romanianSpecs?.general?.categorii) {
        p.romanianSpecs.general.categorii = replaceT5Transporter(p.romanianSpecs.general.categorii);
      }

      await p.save();
    }
  }

  if (executeMode) {
    console.log(`Updated ${products.length} products.`);
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
