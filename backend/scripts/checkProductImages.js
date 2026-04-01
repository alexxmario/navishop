/**
 * Script to check product images
 *
 * Usage: node scripts/checkProductImages.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/navishop';

async function checkProductImages() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the specific product
    const product = await Product.findOne({
      name: { $regex: /BMW.*Seria 3.*2004-2013.*CCC.*12.3/i }
    });

    if (!product) {
      console.log('Product not found. Searching for similar...');
      const similar = await Product.find({
        name: { $regex: /BMW.*Seria 3/i }
      }).select('name images');

      console.log('\nSimilar products:');
      similar.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Images: ${JSON.stringify(p.images, null, 2)}`);
      });
    } else {
      console.log('\n========================================');
      console.log('PRODUCT FOUND');
      console.log('========================================');
      console.log(`Name: ${product.name}`);
      console.log(`ID: ${product._id}`);
      console.log(`\nImages array:`);
      console.log(JSON.stringify(product.images, null, 2));
    }

    // Also check for any products with broken/empty images
    console.log('\n========================================');
    console.log('PRODUCTS WITH POTENTIAL IMAGE ISSUES');
    console.log('========================================');

    const productsWithIssues = await Product.find({
      $or: [
        { images: { $exists: false } },
        { images: { $size: 0 } },
        { 'images.url': { $in: [null, '', undefined] } }
      ]
    }).select('name images').limit(20);

    console.log(`\nFound ${productsWithIssues.length} products with potential image issues:\n`);
    productsWithIssues.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Images: ${JSON.stringify(p.images)}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProductImages();
