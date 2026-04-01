/**
 * Script to add "PilotOn" after "Navigatie" in product names where it's missing
 *
 * Example:
 *   "Navigatie BMW X5..." → "Navigatie PilotOn BMW X5..."
 *   "Navigatie PilotOn BMW..." → no change (already has PilotOn)
 *
 * Usage: node scripts/addPilotOnToNavigatie.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/navishop';

async function addPilotOnToNavigatie() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find products that start with "Navigatie" but don't have "PilotOn" right after
    // Match: "Navigatie " followed by anything that's NOT "PilotOn"
    const query = {
      $and: [
        { name: { $regex: /^Navigatie\s/i } },           // Starts with "Navigatie "
        { name: { $not: { $regex: /^Navigatie\s+PilotOn/i } } }  // But NOT "Navigatie PilotOn"
      ]
    };

    const productsToUpdate = await Product.find(query).select('name');

    console.log('\n========================================');
    console.log('PRODUCTS TO UPDATE');
    console.log('========================================');
    console.log(`Found ${productsToUpdate.length} products:\n`);

    productsToUpdate.forEach((product, index) => {
      const newName = product.name.replace(/^(Navigatie)\s+/i, '$1 PilotOn ');
      console.log(`${index + 1}. BEFORE: ${product.name}`);
      console.log(`   AFTER:  ${newName}`);
      console.log('');
    });

    if (productsToUpdate.length === 0) {
      console.log('All "Navigatie" products already have "PilotOn" in the name.');
      await mongoose.disconnect();
      return;
    }

    // Update each product
    let updatedCount = 0;
    let skippedCount = 0;
    for (const product of productsToUpdate) {
      const newName = product.name.replace(/^(Navigatie)\s+/i, '$1 PilotOn ');

      // Generate base slug
      let baseSlug = newName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 120);

      // Check if slug already exists (for another product)
      let newSlug = baseSlug;
      let slugExists = await Product.findOne({ slug: newSlug, _id: { $ne: product._id } });

      if (slugExists) {
        // Add unique suffix
        const suffix = Date.now().toString().slice(-6);
        newSlug = `${baseSlug}-${suffix}`.substring(0, 120);
        console.log(`⚠️  Slug conflict for "${product.name}", using: ${newSlug}`);
      }

      try {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              name: newName,
              slug: newSlug
            }
          }
        );
        updatedCount++;
      } catch (err) {
        console.log(`❌ Skipped "${product.name}": ${err.message}`);
        skippedCount++;
      }
    }

    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`✅ Updated ${updatedCount} products`);
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} products due to errors`);
    }

    // Verification
    console.log('\n========================================');
    console.log('VERIFICATION - Sample of updated products');
    console.log('========================================\n');

    const verifyProducts = await Product.find({
      name: { $regex: /^Navigatie\s+PilotOn/i }
    }).select('name').limit(10);

    verifyProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addPilotOnToNavigatie();
