require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function verifyCleanup() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    const unwantedTexts = [
      'Va multumim ca ati ales produsele NAVI-ABC',
      'Va mulțumim că ați ales produsele NAVI-ABC'
    ];

    const searchQueries = unwantedTexts.map(text => ({
      $or: [
        { description: { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { 'structuredDescription.originalDescription': { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      ]
    }));

    const products = await Product.find({ $or: searchQueries }).limit(10);

    console.log(`Products still containing unwanted text: ${products.length}`);

    if (products.length > 0) {
      console.log('\nFound products with unwanted text:');
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);

        if (product.description && product.description.toLowerCase().includes('multumim')) {
          console.log(`   ❌ Description still contains unwanted text`);
          console.log(`   Description snippet: ${product.description.substring(0, 200)}...`);
        }

        if (product.structuredDescription?.originalDescription &&
            product.structuredDescription.originalDescription.toLowerCase().includes('multumim')) {
          console.log(`   ❌ Structured description still contains unwanted text`);
          console.log(`   Structured snippet: ${product.structuredDescription.originalDescription.substring(0, 200)}...`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No products found with unwanted text in database');
    }

    // Also check for any broad patterns
    console.log('\nChecking for any products with "multumim" or similar patterns...');
    const broadSearch = await Product.find({
      $or: [
        { description: { $regex: 'multumim|ales.*produsele', $options: 'i' } },
        { 'structuredDescription.originalDescription': { $regex: 'multumim|ales.*produsele', $options: 'i' } }
      ]
    }).limit(5);

    console.log(`Products with broader pattern match: ${broadSearch.length}`);

    if (broadSearch.length > 0) {
      broadSearch.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Description preview: ${product.description.substring(0, 150)}...`);
      });
    }

    await mongoose.connection.close();
    console.log('\nVerification completed');

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyCleanup();