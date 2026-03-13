const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function updateBrandName() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Find all products with brand "Navi ABC"
    const products = await Product.find({
      brand: 'Navi ABC'
    });

    console.log(`Found ${products.length} products with brand "Navi ABC":`);

    for (const product of products) {
      console.log(`- ${product.name}`);
    }

    if (products.length === 0) {
      console.log('No products to update.');
      await mongoose.connection.close();
      return;
    }

    // Update all products
    const result = await Product.updateMany(
      { brand: 'Navi ABC' },
      { $set: { brand: 'PilotOn' } }
    );

    console.log(`\nUpdated ${result.modifiedCount} products to brand "PilotOn"`);

    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateBrandName();
