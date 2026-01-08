require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function testGpsApi() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Fetch products like the API does
    const products = await Product.find({
      category: 'gps',
      status: 'active'
    }).lean();

    console.log(`📋 Found ${products.length} GPS products\n`);

    // Try to serialize each product to JSON
    console.log('Testing JSON serialization...\n');

    for (const product of products) {
      try {
        JSON.stringify(product);
        console.log(`✅ ${product.name} - OK`);
      } catch (error) {
        console.log(`❌ ${product.name} - FAILED`);
        console.log(`   Error: ${error.message}`);
        console.log(`   SKU: ${product.sku}`);

        // Check each field
        for (const [key, value] of Object.entries(product)) {
          try {
            JSON.stringify(value);
          } catch (e) {
            console.log(`   Problem field: ${key}`);
            console.log(`   Value type: ${typeof value}`);
          }
        }
      }
    }

    // Try to serialize all products at once (like the API does)
    console.log('\n\nTesting full array serialization...');
    try {
      const json = JSON.stringify({ products, pagination: {}, filters: {} });
      console.log(`✅ Full API response can be serialized (${json.length} bytes)`);
    } catch (error) {
      console.log(`❌ Full API response FAILED`);
      console.log(`   Error: ${error.message}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGpsApi();
