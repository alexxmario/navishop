require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    const totalCount = await Product.countDocuments();
    console.log('Total products in database:', totalCount);

    const vwProduct = await Product.findOne({slug: 'navigatie-piloton-vw-amarok-2016-2022-2k-8gb-256gb-8-core'});
    if (vwProduct) {
      console.log('VW Amarok found in database');
      console.log('Description length:', vwProduct.description.length);
      console.log('Has structured description:', !!vwProduct.structuredDescription);
      console.log('Structured sections:', vwProduct.structuredDescription?.sections?.length || 0);
      console.log('First 100 chars:', vwProduct.description.substring(0, 100));
    } else {
      console.log('VW Amarok NOT found in database');
    }

    // Check some products that show "Product not found"
    const sampleProducts = await Product.find({}).limit(5);
    console.log('\nSample product slugs:');
    sampleProducts.forEach(p => console.log('  -', p.slug));

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkProducts();