require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkSubcategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    const gpsProducts = await Product.find({ category: 'gps' });

    console.log('📋 GPS Products and their subcategories:\n');
    console.log('='.repeat(80));

    gpsProducts.forEach(product => {
      console.log(`${product.name}`);
      console.log(`  SKU: ${product.sku}`);
      console.log(`  Subcategory: ${product.subcategory || 'NOT SET'}`);
      console.log(`  Screen: ${product.specifications?.find(s => s.key === 'Ecran')?.value || 'N/A'}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n📊 Summary by subcategory:');

    const bySubcategory = {};
    gpsProducts.forEach(p => {
      const sub = p.subcategory || 'NONE';
      if (!bySubcategory[sub]) bySubcategory[sub] = [];
      bySubcategory[sub].push(p.name);
    });

    Object.entries(bySubcategory).forEach(([sub, products]) => {
      console.log(`\n${sub}: ${products.length} products`);
      products.forEach(p => console.log(`  - ${p}`));
    });

    await mongoose.connection.close();
    console.log('\n✅ Done\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSubcategories();
