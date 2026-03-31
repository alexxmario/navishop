/**
 * Script to populate the frecventa and modelProcesor fields for products
 *
 * Rules:
 * 1. Octa Core / 8 Core WITHOUT 2K -> Frecventa 1.6 Ghz
 * 2. Octa Core / 8 Core WITH 2K -> Model procesor "Octa Core 8667 MTK" AND Frecventa "2.0 Ghz"
 *
 * Usage: node scripts/populateFrecventa.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/navishop';

async function populateFrecventa() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // ========================================
    // RULE 1: Octa Core WITHOUT 2K -> 1.6 Ghz
    // (Check for 2K in product name, not processor field)
    // ========================================
    const queryWithout2K = {
      $and: [
        {
          'romanianSpecs.hardware.modelProcesor': {
            $regex: /(octa\s*core|8[\s-]*core)/i
          }
        },
        {
          name: {
            $not: /2k/i  // Does NOT contain "2K" in product name
          }
        }
      ]
    };

    const productsWithout2K = await Product.find(queryWithout2K).select('name romanianSpecs.hardware.modelProcesor romanianSpecs.hardware.frecventa');

    console.log('\n========================================');
    console.log('RULE 1: Octa Core WITHOUT 2K -> 1.6 Ghz');
    console.log('========================================');
    console.log(`Found ${productsWithout2K.length} products:\n`);

    productsWithout2K.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Procesor: ${product.romanianSpecs?.hardware?.modelProcesor || 'N/A'}`);
      console.log(`   Frecventa actuală: ${product.romanianSpecs?.hardware?.frecventa || 'N/A'}`);
    });

    if (productsWithout2K.length > 0) {
      const result1 = await Product.updateMany(
        queryWithout2K,
        {
          $set: {
            'romanianSpecs.hardware.frecventa': '1.6 Ghz'
          }
        }
      );
      console.log(`\n✅ Updated ${result1.modifiedCount} products with frecventa: 1.6 Ghz`);
    }

    // ========================================
    // RULE 2: Octa Core WITH 2K -> 2.0 Ghz + Model Procesor
    // (Check for 2K in product name, not processor field)
    // ========================================
    const queryWith2K = {
      $and: [
        {
          'romanianSpecs.hardware.modelProcesor': {
            $regex: /(octa\s*core|8[\s-]*core)/i
          }
        },
        {
          name: {
            $regex: /2k/i  // Contains "2K" in product name
          }
        }
      ]
    };

    const productsWith2K = await Product.find(queryWith2K).select('name romanianSpecs.hardware.modelProcesor romanianSpecs.hardware.frecventa');

    console.log('\n========================================');
    console.log('RULE 2: Octa Core WITH 2K -> Octa Core 8667 MTK + 2.0 Ghz');
    console.log('========================================');
    console.log(`Found ${productsWith2K.length} products:\n`);

    productsWith2K.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Procesor actual: ${product.romanianSpecs?.hardware?.modelProcesor || 'N/A'}`);
      console.log(`   Frecventa actuală: ${product.romanianSpecs?.hardware?.frecventa || 'N/A'}`);
    });

    if (productsWith2K.length > 0) {
      const result2 = await Product.updateMany(
        queryWith2K,
        {
          $set: {
            'romanianSpecs.hardware.modelProcesor': 'Octa Core 8667 MTK',
            'romanianSpecs.hardware.frecventa': '2.0 Ghz'
          }
        }
      );
      console.log(`\n✅ Updated ${result2.modifiedCount} products with:`);
      console.log('   - Model Procesor: Octa Core 8667 MTK');
      console.log('   - Frecventa: 2.0 Ghz');
    }

    // ========================================
    // VERIFICATION
    // ========================================
    console.log('\n========================================');
    console.log('VERIFICATION');
    console.log('========================================');

    const allUpdated = await Product.find({
      'romanianSpecs.hardware.frecventa': { $exists: true, $ne: '' }
    }).select('name romanianSpecs.hardware.modelProcesor romanianSpecs.hardware.frecventa');

    console.log(`\nTotal products with frecventa set: ${allUpdated.length}\n`);
    allUpdated.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Procesor: ${product.romanianSpecs?.hardware?.modelProcesor}`);
      console.log(`   Frecventa: ${product.romanianSpecs?.hardware?.frecventa}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

populateFrecventa();
