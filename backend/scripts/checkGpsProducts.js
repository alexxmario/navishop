require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkGpsProducts() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Find all GPS products
    const allGps = await Product.find({ category: 'gps' });
    console.log(`📋 Total GPS products: ${allGps.length}\n`);

    console.log('Products and their description status:\n');
    console.log('='.repeat(80));

    for (const product of allGps) {
      const hasDescription = product.description && product.description.trim().length > 0;
      const hasStructured = product.structuredDescription && product.structuredDescription.sections?.length > 0;
      const hasRomanianSpecs = product.romanianSpecs && Object.keys(product.romanianSpecs).length > 0;
      const specsCount = product.specifications?.length || 0;

      console.log(`\n📦 ${product.name}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Description: ${hasDescription ? '✅ Yes (' + product.description.length + ' chars)' : '❌ No'}`);
      console.log(`   Structured: ${hasStructured ? '✅ Yes (' + product.structuredDescription.sections.length + ' sections)' : '❌ No'}`);
      console.log(`   Romanian Specs: ${hasRomanianSpecs ? '✅ Yes' : '❌ No'}`);
      console.log(`   Specifications: ${specsCount} items`);

      if (hasDescription && product.description.length < 100) {
        console.log(`   ⚠️  Description seems very short: "${product.description}"`);
      }
    }

    console.log('\n' + '='.repeat(80));

    // Summary
    const withDesc = allGps.filter(p => p.description && p.description.trim().length > 0).length;
    const withoutDesc = allGps.length - withDesc;
    const withStructured = allGps.filter(p => p.structuredDescription?.sections?.length > 0).length;
    const withRomanian = allGps.filter(p => p.romanianSpecs && Object.keys(p.romanianSpecs).length > 0).length;

    console.log('\n📊 Summary:');
    console.log(`   Total GPS products: ${allGps.length}`);
    console.log(`   With description: ${withDesc}`);
    console.log(`   Without description: ${withoutDesc}`);
    console.log(`   With structured description: ${withStructured}`);
    console.log(`   With Romanian specs: ${withRomanian}`);

    await mongoose.connection.close();
    console.log('\n✅ Done\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkGpsProducts();
