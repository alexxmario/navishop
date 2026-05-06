const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function listCheckProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    const checkProducts = await Product.find({
      name: { $regex: 'check', $options: 'i' }
    }).select('name slug sku').lean();

    console.log(`Found ${checkProducts.length} products with "check" in name:\n`);
    for (const p of checkProducts) {
      console.log(`Name: ${p.name}`);
      console.log(`Slug: ${p.slug}`);
      console.log(`SKU:  ${p.sku}`);
      console.log('---');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

listCheckProducts();
