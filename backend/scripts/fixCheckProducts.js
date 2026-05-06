const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Differentiation rules for the name
// Each rule tries to make the name unique vs the product it conflicts with
function differentiateName(name) {
  let newName = name;

  // "4 Core" -> "4Core" / "Quad Core"
  if (/\b4\s*Core\b/i.test(newName)) {
    newName = newName.replace(/\b4\s*Core\b/i, 'Quad Core');
  }
  // "8 Core" -> "8Core" / "Octa Core"
  else if (/\b8\s*Core\b/i.test(newName)) {
    newName = newName.replace(/\b8\s*Core\b/i, 'Octa Core');
  }
  // "6 Core" -> "Hexa Core"
  else if (/\b6\s*Core\b/i.test(newName)) {
    newName = newName.replace(/\b6\s*Core\b/i, 'Hexa Core');
  }
  // "2 Core" -> "Dual Core"
  else if (/\b2\s*Core\b/i.test(newName)) {
    newName = newName.replace(/\b2\s*Core\b/i, 'Dual Core');
  }
  // If name has "Quad Core", switch to "4Core"
  else if (/\bQuad\s*Core\b/i.test(newName)) {
    newName = newName.replace(/\bQuad\s*Core\b/i, '4Core');
  }
  // If name has "Octa Core", switch to "8Core"
  else if (/\bOcta\s*Core\b/i.test(newName)) {
    newName = newName.replace(/\bOcta\s*Core\b/i, '8Core');
  }

  // If nothing changed above, try other differentiations
  if (newName === name) {
    // Try swapping RAM format: "4GB" -> "4 GB", "4 GB" -> "4GB"
    if (/\d+\s+GB/i.test(newName)) {
      newName = newName.replace(/(\d+)\s+(GB)/gi, '$1$2');
    } else if (/\d+GB/i.test(newName)) {
      newName = newName.replace(/(\d+)(GB)/gi, '$1 $2');
    }
    // Try swapping storage format: "64GB" -> "64 GB"
    else if (/\d+\s+GB/i.test(newName)) {
      newName = newName.replace(/(\d+)\s+(GB)/gi, '$1$2');
    }
  }

  // Last resort: if still same, append "V2"
  if (newName === name) {
    newName = name + ' V2';
  }

  return newName;
}

async function fixCheckProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    // Find all products with CHECK in name
    const checkProducts = await Product.find({
      name: { $regex: 'CHECK', $options: 'i' }
    });

    console.log(`Found ${checkProducts.length} products with "CHECK" in name\n`);

    if (checkProducts.length === 0) {
      console.log('Nothing to fix.');
      await mongoose.connection.close();
      return;
    }

    // Get all existing names, slugs, and SKUs to avoid new conflicts
    const allProducts = await Product.find({}).select('name slug sku').lean();
    const existingNames = new Set(allProducts.map(p => p.name));
    const existingSlugs = new Set(allProducts.map(p => p.slug));
    const existingSkus = new Set(allProducts.map(p => p.sku));

    let fixedCount = 0;
    let failedCount = 0;

    for (const product of checkProducts) {
      const oldName = product.name;
      const oldSlug = product.slug;
      const oldSku = product.sku;

      // Strip CHECK from name, slug, sku
      const baseName = oldName.replace(/\s*CHECK\s*/gi, '').trim();
      const baseSku = oldSku.replace(/-?CHECK/gi, '').trim();

      // Differentiate the name
      let newName = differentiateName(baseName);

      // Make sure the new name doesn't conflict either
      let attempt = 0;
      while (existingNames.has(newName) && attempt < 5) {
        attempt++;
        if (attempt === 1) {
          // Try alternative differentiation
          newName = baseName + ' V2';
        } else {
          newName = baseName + ' V' + (attempt + 1);
        }
      }

      const newSlug = generateSlug(newName);
      let newSku = baseSku;

      // Ensure slug is unique
      let slugBase = newSlug;
      let slugAttempt = 2;
      let finalSlug = newSlug;
      while (existingSlugs.has(finalSlug) && finalSlug !== oldSlug) {
        finalSlug = slugBase + '-v' + slugAttempt;
        slugAttempt++;
      }

      // Ensure SKU is unique
      while (existingSkus.has(newSku) && newSku !== oldSku) {
        newSku = newSku + '-V2';
      }

      if (existingNames.has(newName) && newName !== oldName) {
        console.log(`[FAIL] Could not find unique name for: ${oldName}`);
        failedCount++;
        continue;
      }

      // Remove old entries from sets, add new ones
      existingNames.delete(oldName);
      existingSlugs.delete(oldSlug);
      existingSkus.delete(oldSku);
      existingNames.add(newName);
      existingSlugs.add(finalSlug);
      existingSkus.add(newSku);

      // Update the product
      product.name = newName;
      product.slug = finalSlug;
      product.sku = newSku;

      // Update romanianSpecs.general.sku if it exists
      if (product.romanianSpecs?.general?.sku) {
        product.romanianSpecs.general.sku = newSku;
        product.markModified('romanianSpecs');
      }

      console.log(`[FIX] ${oldName}`);
      console.log(`  name: "${oldName}" -> "${newName}"`);
      console.log(`  slug: "${oldSlug}" -> "${finalSlug}"`);
      console.log(`  sku:  "${oldSku}" -> "${newSku}"`);
      console.log('');

      await product.save({ validateBeforeSave: false });
      fixedCount++;
    }

    console.log('========================================');
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Total CHECK products: ${checkProducts.length}`);
    console.log('========================================');

    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixCheckProducts();
