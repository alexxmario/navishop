/**
 * Debug script to check images for a specific product
 *
 * Usage: node scripts/debugProductImages.js <productId>
 * Example: node scripts/debugProductImages.js 69a0524c91d4068d8689d7ba
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/navishop';
const uploadDir = '/var/www/navishop/navishop/public/images/products';

const productId = process.argv[2] || '69a0524c91d4068d8689d7ba';

async function debugProductImages() {
  try {
    console.log('========================================');
    console.log('DEBUG PRODUCT IMAGES');
    console.log('========================================');
    console.log('Product ID:', productId);
    console.log('Upload directory:', uploadDir);
    console.log('');

    // Check if upload directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('❌ Upload directory does NOT exist!');
    } else {
      const files = fs.readdirSync(uploadDir);
      console.log(`✅ Upload directory exists (${files.length} files)`);
    }
    console.log('');

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const product = await Product.findById(productId).select('name images');

    if (!product) {
      console.log('❌ Product not found!');
      await mongoose.disconnect();
      return;
    }

    console.log('Product:', product.name);
    console.log('Images in database:', product.images?.length || 0);
    console.log('');
    console.log('========================================');
    console.log('IMAGE ANALYSIS');
    console.log('========================================\n');

    if (!product.images || product.images.length === 0) {
      console.log('No images found in database for this product');
      await mongoose.disconnect();
      return;
    }

    let existCount = 0;
    let missingCount = 0;

    product.images.forEach((img, i) => {
      const url = img.url || img;
      console.log(`${i + 1}. URL: ${url}`);

      // Extract filename from URL
      const filename = url.split('/').pop();
      console.log(`   Filename: ${filename}`);

      // Check if file exists
      const filePath = path.join(uploadDir, filename);
      const exists = fs.existsSync(filePath);

      if (exists) {
        const stats = fs.statSync(filePath);
        console.log(`   File exists: ✅ YES (${(stats.size / 1024).toFixed(1)} KB)`);
        existCount++;
      } else {
        console.log(`   File exists: ❌ NO - FILE MISSING!`);
        missingCount++;
      }

      // Check URL format
      if (url.includes('api.navi.piloton.ro')) {
        console.log('   URL type: Absolute (api.navi.piloton.ro)');
      } else if (url.startsWith('/images/')) {
        console.log('   URL type: Relative (/images/...)');
      } else if (url.includes('piloton/')) {
        console.log('   URL type: CDN/External (piloton/)');
      } else {
        console.log('   URL type: Unknown format');
      }

      console.log('');
    });

    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total images: ${product.images.length}`);
    console.log(`Files exist: ${existCount}`);
    console.log(`Files missing: ${missingCount}`);

    if (missingCount > 0) {
      console.log('\n⚠️  Some image files are MISSING from the server!');
      console.log('This means the files were never uploaded or were deleted.');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugProductImages();
