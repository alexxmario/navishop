const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function updateLuminiCategory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Find all products with "lumini" in the name (case insensitive)
    const products = await Product.find({
      name: { $regex: /lumini/i }
    });

    console.log(`Found ${products.length} products with "lumini" in name:`);

    for (const product of products) {
      console.log(`- ${product.name} (current category: ${product.category})`);
    }

    if (products.length === 0) {
      console.log('No products to update.');
      await mongoose.connection.close();
      return;
    }

    // Update all products
    const result = await Product.updateMany(
      { name: { $regex: /lumini/i } },
      { $set: { category: 'lumini-ambientale' } }
    );

    console.log(`\nUpdated ${result.modifiedCount} products to category "lumini-ambientale"`);

    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updateLuminiCategory();
