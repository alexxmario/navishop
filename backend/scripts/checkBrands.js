const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function checkBrands() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    const brands = await Product.aggregate([
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Brands found in database:');
    console.log('─'.repeat(40));
    for (const b of brands) {
      console.log(`  ${b._id || '(empty)'} — ${b.count} products`);
    }
    console.log('─'.repeat(40));
    console.log(`Total brands: ${brands.length}`);
    console.log(`Total products: ${brands.reduce((sum, b) => sum + b.count, 0)}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkBrands();
