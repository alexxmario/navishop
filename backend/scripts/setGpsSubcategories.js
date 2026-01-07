require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Mapping of SKUs to their subcategories based on screen size
const subcategoryMapping = {
  // 5 inch
  'P5': '5-inch',

  // 7 inch
  'M9Plus': '7-inch',
  'M9Plus-9837': '7-inch',
  'A11S Pro': '7-inch',
  'M14': '7-inch',
  'A12S Pro': '7-inch',
  'H12': '7-inch',
  'H11': '7-inch',

  // 9 inch
  'P12XL': '9-inch',
  'M14XL': '9-inch',
  'M10XL': '9-inch',
  'P11XL': '9-inch',
  'A9XL': '9-inch',
  'A10XL': '9-inch',

  // Special - dedicated car navigation (10.36 inch)
  'M8B7': 'android'
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function updateSubcategories() {
  console.log('🚀 Updating GPS product subcategories...\n');
  console.log('='.repeat(60));

  try {
    await connectDB();

    let successCount = 0;
    let failCount = 0;

    for (const [sku, subcategory] of Object.entries(subcategoryMapping)) {
      try {
        const product = await Product.findOne({ sku });

        if (!product) {
          console.log(`❌ Product with SKU ${sku} not found`);
          failCount++;
          continue;
        }

        // Update subcategory
        await Product.findByIdAndUpdate(product._id, { subcategory });

        console.log(`✅ ${product.name}`);
        console.log(`   SKU: ${sku} → Subcategory: ${subcategory}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to update ${sku}: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully updated: ${successCount}/${Object.keys(subcategoryMapping).length}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('='.repeat(60));

    console.log('\n📋 Subcategory distribution:');
    const fiveInch = Object.values(subcategoryMapping).filter(s => s === '5-inch').length;
    const sevenInch = Object.values(subcategoryMapping).filter(s => s === '7-inch').length;
    const nineInch = Object.values(subcategoryMapping).filter(s => s === '9-inch').length;
    const android = Object.values(subcategoryMapping).filter(s => s === 'android').length;

    console.log(`   5-inch: ${fiveInch} products`);
    console.log(`   7-inch: ${sevenInch} products`);
    console.log(`   9-inch: ${nineInch} products`);
    console.log(`   Android: ${android} products`);

    await mongoose.connection.close();
    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateSubcategories();
