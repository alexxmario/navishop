/**
 * Script to update brand to "PilotOn" for all navigation products
 *
 * Usage: node scripts/updateBrandToPilotOn.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/navishop';

async function updateBrandToPilotOn() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all navigation products that don't have brand "PilotOn"
    const query = {
      $and: [
        {
          $or: [
            { category: 'navigatii-gps' },
            { name: { $regex: /navigat/i } }  // Match "Navigatie", "Navigatii", etc.
          ]
        },
        {
          brand: { $ne: 'PilotOn' }
        }
      ]
    };

    const productsToUpdate = await Product.find(query).select('name brand category');

    console.log(`\nFound ${productsToUpdate.length} navigation products without "PilotOn" brand:\n`);

    productsToUpdate.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Current brand: ${product.brand || 'N/A'}`);
      console.log(`   Category: ${product.category}`);
    });

    if (productsToUpdate.length === 0) {
      console.log('All navigation products already have "PilotOn" as brand.');
      await mongoose.disconnect();
      return;
    }

    // Update all matching products
    const result = await Product.updateMany(
      query,
      {
        $set: {
          brand: 'PilotOn'
        }
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} products with brand: PilotOn`);

    // Verification
    console.log('\n========================================');
    console.log('VERIFICATION');
    console.log('========================================');

    const updatedProducts = await Product.find({
      $or: [
        { category: 'navigatii-gps' },
        { name: { $regex: /navigat/i } }
      ]
    }).select('name brand');

    console.log(`\nAll navigation products and their brands:\n`);
    updatedProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} -> ${product.brand}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateBrandToPilotOn();
