/**
 * Script to populate the frecventa field for products
 * Rule: All Octa Core products WITHOUT 2K -> Frecventa 1.6 Ghz
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

    // Find all Octa Core / 8 Core products that don't have 2K in the processor model
    // Match: "Octa Core", "OctaCore", "8 Core", "8-Core", "8Core"
    const query = {
      $and: [
        {
          'romanianSpecs.hardware.modelProcesor': {
            $regex: /(octa\s*core|8[\s-]*core)/i  // Contains "Octa Core" or "8 Core" variations
          }
        },
        {
          'romanianSpecs.hardware.modelProcesor': {
            $not: /2k/i  // Does NOT contain "2K"
          }
        }
      ]
    };

    // First, let's see what products match
    const matchingProducts = await Product.find(query).select('name romanianSpecs.hardware.modelProcesor romanianSpecs.hardware.frecventa');

    console.log(`\nFound ${matchingProducts.length} Octa Core products without 2K:\n`);

    matchingProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Procesor: ${product.romanianSpecs?.hardware?.modelProcesor || 'N/A'}`);
      console.log(`   Frecventa actuală: ${product.romanianSpecs?.hardware?.frecventa || 'N/A'}`);
      console.log('');
    });

    if (matchingProducts.length === 0) {
      console.log('No products found matching the criteria.');
      await mongoose.disconnect();
      return;
    }

    // Update all matching products
    const result = await Product.updateMany(
      query,
      {
        $set: {
          'romanianSpecs.hardware.frecventa': '1.6 Ghz'
        }
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} products with frecventa: 1.6 Ghz`);

    // Verify the update
    const verifyProducts = await Product.find(query).select('name romanianSpecs.hardware.frecventa');
    console.log('\nVerification - Updated products:');
    verifyProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} -> ${product.romanianSpecs?.hardware?.frecventa}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

populateFrecventa();
