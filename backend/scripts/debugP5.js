const mongoose = require('mongoose');
const Product = require('../models/Product');

async function debugP5() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/piloton');
    console.log('Connected to MongoDB');

    // Check P5 product
    const p5 = await Product.findOne({ sku: 'P5' });

    if (!p5) {
      console.log('❌ P5 product NOT FOUND in database!');
      console.log('\nSearching for any product with P5 in name...');
      const similar = await Product.find({ name: /P5/i }).select('name sku category subcategory status');
      console.log('Found:', similar);
      return;
    }

    console.log('\n✅ P5 Product Found:');
    console.log('Name:', p5.name);
    console.log('SKU:', p5.sku);
    console.log('Slug:', p5.slug);
    console.log('Category:', p5.category);
    console.log('Subcategory:', p5.subcategory);
    console.log('Status:', p5.status);
    console.log('Stock:', p5.stock);
    console.log('Price:', p5.price);

    // Check what query would match it
    console.log('\n--- Query Tests ---');

    const test1 = await Product.find({ category: 'gps', status: 'active' }).countDocuments();
    console.log(`Query {category: 'gps', status: 'active'}: ${test1} products`);

    const test2 = await Product.find({ category: 'gps', status: 'active', subcategory: '5-inch' }).countDocuments();
    console.log(`Query {category: 'gps', status: 'active', subcategory: '5-inch'}: ${test2} products`);

    if (test2 === 0 && p5.subcategory !== '5-inch') {
      console.log('\n⚠️  P5 subcategory is NOT "5-inch", it is:', p5.subcategory);
      console.log('Fixing...');
      p5.subcategory = '5-inch';
      await p5.save();
      console.log('✅ Fixed! P5 now has subcategory: "5-inch"');
    }

    // Show all GPS products
    console.log('\n--- All GPS Products ---');
    const allGps = await Product.find({ category: 'gps', status: 'active' })
      .select('name sku subcategory stock')
      .sort({ subcategory: 1 });

    allGps.forEach(p => {
      console.log(`${p.sku.padEnd(15)} | ${(p.subcategory || 'NO SUBCATEGORY').padEnd(12)} | Stock: ${p.stock} | ${p.name.substring(0, 50)}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugP5();
