const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function updatePortbagajCategory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Find all products with "portbagaj electric" in the name (case insensitive)
    const products = await Product.find({
      name: { $regex: /portbagaj electric/i }
    });

    console.log(`Found ${products.length} products with "portbagaj electric" in name:`);

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
      { name: { $regex: /portbagaj electric/i } },
      { $set: { category: 'portbagaj-electric' } }
    );

    console.log(`\nUpdated ${result.modifiedCount} products to category "portbagaj-electric"`);

    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

updatePortbagajCategory();
