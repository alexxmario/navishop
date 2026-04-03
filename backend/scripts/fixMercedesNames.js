const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config();

async function fixMercedesNames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Find all products with "Mercedes" in the name but NOT "Mercedes Benz" or "Mercedes-Benz"
    const mercedesProducts = await Product.find({
      name: {
        $regex: /Mercedes/i,
        $not: { $regex: /Mercedes[\s-]?Benz/i }
      }
    });

    console.log(`Found ${mercedesProducts.length} Mercedes products without "Benz"`);

    if (mercedesProducts.length === 0) {
      console.log('No products to update.');
      await mongoose.disconnect();
      return;
    }

    // Preview the changes
    console.log('\n--- Preview of changes ---');
    for (const product of mercedesProducts) {
      const newName = product.name.replace(/Mercedes(?![\s-]?Benz)/gi, 'Mercedes Benz');
      console.log(`"${product.name}" -> "${newName}"`);
    }

    // Ask for confirmation
    console.log('\n--- Applying changes ---');

    let updated = 0;
    for (const product of mercedesProducts) {
      const newName = product.name.replace(/Mercedes(?![\s-]?Benz)/gi, 'Mercedes Benz');

      if (newName !== product.name) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { name: newName, brand: 'Mercedes Benz' } }
        );
        updated++;
        console.log(`Updated: "${product.name}" -> "${newName}" (brand: Mercedes Benz)`);
      }
    }

    console.log(`\nSuccessfully updated ${updated} product names`);

    // Also fix brand for products that already have "Mercedes Benz" in name but wrong brand
    const existingMercedesBenz = await Product.find({
      name: { $regex: /Mercedes[\s-]?Benz/i },
      brand: { $ne: 'Mercedes Benz' }
    });

    if (existingMercedesBenz.length > 0) {
      console.log(`\n--- Fixing brand for ${existingMercedesBenz.length} existing Mercedes Benz products ---`);
      for (const product of existingMercedesBenz) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { brand: 'Mercedes Benz' } }
        );
        console.log(`Fixed brand for: "${product.name}" (was: "${product.brand}")`);
      }
      console.log(`Fixed brand for ${existingMercedesBenz.length} products`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing Mercedes names:', error);
    process.exit(1);
  }
}

fixMercedesNames();
