/**
 * Script to replace "IPS" with "QLED" in product specifications
 *
 * Usage: node scripts/replaceIPStoQLED.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/navishop';

async function replaceIPStoQLED() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all products that have "IPS" anywhere in romanianSpecs
    const productsWithIPS = await Product.find({
      $or: [
        { 'romanianSpecs.display.tipDisplay': { $regex: /ips/i } },
        { 'romanianSpecs.display.tehnologieDisplay': { $regex: /ips/i } },
        { 'romanianSpecs.display.rezolutie': { $regex: /ips/i } },
        { 'romanianSpecs.hardware.modelProcesor': { $regex: /ips/i } },
        { name: { $regex: /ips/i } }
      ]
    });

    console.log(`\nFound ${productsWithIPS.length} products with "IPS":\n`);

    productsWithIPS.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      if (product.romanianSpecs?.display?.tipDisplay) {
        console.log(`   Tip Display: ${product.romanianSpecs.display.tipDisplay}`);
      }
      if (product.romanianSpecs?.display?.tehnologieDisplay) {
        console.log(`   Tehnologie Display: ${product.romanianSpecs.display.tehnologieDisplay}`);
      }
    });

    if (productsWithIPS.length === 0) {
      console.log('No products found with "IPS" in specifications.');
      await mongoose.disconnect();
      return;
    }

    let totalUpdated = 0;

    // Update each product
    for (const product of productsWithIPS) {
      const updates = {};
      let hasChanges = false;

      // Check and replace in tipDisplay
      if (product.romanianSpecs?.display?.tipDisplay && /ips/i.test(product.romanianSpecs.display.tipDisplay)) {
        updates['romanianSpecs.display.tipDisplay'] = product.romanianSpecs.display.tipDisplay.replace(/ips/gi, 'QLED');
        hasChanges = true;
      }

      // Check and replace in tehnologieDisplay
      if (product.romanianSpecs?.display?.tehnologieDisplay && /ips/i.test(product.romanianSpecs.display.tehnologieDisplay)) {
        updates['romanianSpecs.display.tehnologieDisplay'] = product.romanianSpecs.display.tehnologieDisplay.replace(/ips/gi, 'QLED');
        hasChanges = true;
      }

      // Check and replace in rezolutie (just in case)
      if (product.romanianSpecs?.display?.rezolutie && /ips/i.test(product.romanianSpecs.display.rezolutie)) {
        updates['romanianSpecs.display.rezolutie'] = product.romanianSpecs.display.rezolutie.replace(/ips/gi, 'QLED');
        hasChanges = true;
      }

      if (hasChanges) {
        await Product.updateOne({ _id: product._id }, { $set: updates });
        totalUpdated++;
        console.log(`\n✅ Updated: ${product.name}`);
        Object.entries(updates).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
    }

    console.log(`\n========================================`);
    console.log(`SUMMARY: Updated ${totalUpdated} products`);
    console.log(`========================================`);

    // Verification
    console.log('\nVerification - Products that still have IPS:');
    const remaining = await Product.find({
      $or: [
        { 'romanianSpecs.display.tipDisplay': { $regex: /ips/i } },
        { 'romanianSpecs.display.tehnologieDisplay': { $regex: /ips/i } }
      ]
    }).select('name romanianSpecs.display.tipDisplay romanianSpecs.display.tehnologieDisplay');

    if (remaining.length === 0) {
      console.log('None - All IPS references have been replaced with QLED!');
    } else {
      remaining.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
      });
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

replaceIPStoQLED();
