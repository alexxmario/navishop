require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkP5() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    const p5 = await Product.findOne({ sku: 'P5' });

    if (!p5) {
      console.log('❌ P5 product not found!');
      return;
    }

    console.log('📦 P5 Product Details:\n');
    console.log('='.repeat(80));
    console.log(`Name: ${p5.name}`);
    console.log(`SKU: ${p5.sku}`);
    console.log(`Category: ${p5.category}`);
    console.log(`Subcategory: ${p5.subcategory}`);
    console.log(`Stock: ${p5.stock}`);
    console.log(`Status: ${p5.status}`);
    console.log(`Price: ${p5.price} RON`);
    console.log(`Slug: ${p5.slug}`);
    console.log(`Brand: ${p5.brand}`);
    console.log('\n✅ Filtering should work if:');
    console.log(`   - category === 'gps' → ${p5.category === 'gps' ? '✅' : '❌'}`);
    console.log(`   - status === 'active' → ${p5.status === 'active' ? '✅' : '❌'}`);
    console.log(`   - subcategory === '5-inch' → ${p5.subcategory === '5-inch' ? '✅' : '❌'}`);
    console.log(`   - stock > 0 → ${p5.stock > 0 ? '✅' : '❌'}`);

    console.log('\n📋 Images:', p5.images?.length || 0);
    console.log('📋 Specifications:', p5.specifications?.length || 0);
    console.log('📋 Description length:', p5.description?.length || 0);

    await mongoose.connection.close();
    console.log('\n✅ Done\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkP5();
