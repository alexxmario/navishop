require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkGpsSlugs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/piloton');
    console.log('Connected to MongoDB\n');

    const products = await Product.find({ category: 'gps', status: 'active' })
      .select('name sku slug subcategory')
      .sort({ subcategory: 1, sku: 1 });

    console.log('GPS Products by subcategory:\n');

    // Group by subcategory
    const groups = {
      '5-inch': [],
      '7-inch': [],
      '9-inch': [],
      'android': []
    };

    products.forEach(p => {
      if (groups[p.subcategory]) {
        groups[p.subcategory].push(p);
      }
    });

    Object.entries(groups).forEach(([subcategory, prods]) => {
      console.log(`\n${subcategory.toUpperCase()}:`);
      console.log('='.repeat(80));
      prods.forEach(p => {
        console.log(`  SKU: ${p.sku.padEnd(15)} | Slug: ${p.slug}`);
      });
    });

    console.log('\n\nCopy-paste this into CategoryPage.jsx:\n');
    console.log('const subcategoryProducts = {');
    Object.entries(groups).forEach(([subcategory, prods]) => {
      console.log(`  '${subcategory}': [`);
      prods.forEach(p => {
        console.log(`    '${p.slug}',`);
      });
      console.log(`  ],`);
    });
    console.log('};');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

checkGpsSlugs();
