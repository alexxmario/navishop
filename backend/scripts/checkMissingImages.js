/**
 * Script to check for products with missing image files
 *
 * This script:
 * 1. Finds all products with images
 * 2. Checks if image files exist on disk
 * 3. Reports products with missing images
 * 4. Optionally removes broken image references from database
 *
 * Usage:
 *   node scripts/checkMissingImages.js           # Report only
 *   node scripts/checkMissingImages.js --fix     # Fix broken references
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/navishop';
const FIX_MODE = process.argv.includes('--fix');

// Image directory - same as in upload.js
const uploadDir = path.join(__dirname, '../../navishop/public/images/products');

// Extract filename from URL
function getFilenameFromUrl(url) {
  if (!url) return null;
  // Handle both relative and absolute URLs
  // e.g., /images/products/product-123.jpg or https://api.navi.piloton.ro/images/products/product-123.jpg
  const match = url.match(/\/images\/products\/([^?]+)/);
  return match ? match[1] : null;
}

// Check if file exists
function imageFileExists(filename) {
  if (!filename) return false;
  const filePath = path.join(uploadDir, filename);
  return fs.existsSync(filePath);
}

// Check if URL is external (CDN, etc.)
function isExternalUrl(url) {
  if (!url) return false;
  // Check if it's NOT a local image (doesn't contain /images/products/)
  if (!url.includes('/images/products/')) {
    return true;
  }
  // Check if it's pointing to a different domain (not api.navi.piloton.ro)
  if (url.startsWith('http') && !url.includes('api.navi.piloton.ro') && !url.includes('localhost')) {
    return true;
  }
  return false;
}

async function checkMissingImages() {
  try {
    console.log('========================================');
    console.log('MISSING IMAGES CHECKER');
    console.log('========================================');
    console.log(`Mode: ${FIX_MODE ? 'FIX (will update database)' : 'REPORT ONLY'}`);
    console.log(`Upload directory: ${uploadDir}`);
    console.log('');

    // Check if upload directory exists
    if (!fs.existsSync(uploadDir)) {
      console.error(`ERROR: Upload directory does not exist: ${uploadDir}`);
      console.log('Please ensure the path is correct for your environment.');
      process.exit(1);
    }

    // Count files in directory
    const existingFiles = fs.readdirSync(uploadDir);
    console.log(`Total files in upload directory: ${existingFiles.length}`);
    console.log('');

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('');

    // Find all products with images
    const productsWithImages = await Product.find({
      images: { $exists: true, $not: { $size: 0 } }
    }).select('name images');

    console.log(`Found ${productsWithImages.length} products with images`);
    console.log('');

    const productsWithMissingImages = [];
    let totalImages = 0;
    let missingImages = 0;
    let externalImages = 0;
    let validImages = 0;

    // Check each product
    for (const product of productsWithImages) {
      const missingUrls = [];

      for (const image of product.images) {
        const url = image.url || image;
        totalImages++;

        // Skip external URLs
        if (isExternalUrl(url)) {
          externalImages++;
          continue;
        }

        const filename = getFilenameFromUrl(url);
        if (!filename) {
          missingUrls.push({ url, reason: 'Invalid URL format' });
          missingImages++;
          continue;
        }

        if (!imageFileExists(filename)) {
          missingUrls.push({ url, filename, reason: 'File not found' });
          missingImages++;
        } else {
          validImages++;
        }
      }

      if (missingUrls.length > 0) {
        productsWithMissingImages.push({
          product,
          missingUrls
        });
      }
    }

    // Report
    console.log('========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total images checked: ${totalImages}`);
    console.log(`Valid local images: ${validImages}`);
    console.log(`External images (CDN): ${externalImages}`);
    console.log(`Missing local images: ${missingImages}`);
    console.log(`Products affected: ${productsWithMissingImages.length}`);
    console.log('');

    if (productsWithMissingImages.length > 0) {
      console.log('========================================');
      console.log('PRODUCTS WITH MISSING IMAGES');
      console.log('========================================');
      console.log('');

      for (const { product, missingUrls } of productsWithMissingImages) {
        console.log(`Product: ${product.name}`);
        console.log(`ID: ${product._id}`);
        console.log('Missing images:');
        missingUrls.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.filename || m.url}`);
          console.log(`     Reason: ${m.reason}`);
        });
        console.log('');
      }

      // Fix mode
      if (FIX_MODE) {
        console.log('========================================');
        console.log('FIXING DATABASE');
        console.log('========================================');
        console.log('');

        for (const { product, missingUrls } of productsWithMissingImages) {
          const missingFilenames = new Set(missingUrls.map(m => m.filename || m.url));

          // Filter out missing images
          const validImages = product.images.filter(image => {
            const url = image.url || image;
            if (isExternalUrl(url)) return true; // Keep external
            const filename = getFilenameFromUrl(url);
            return !missingFilenames.has(filename) && !missingFilenames.has(url);
          });

          if (validImages.length !== product.images.length) {
            await Product.updateOne(
              { _id: product._id },
              { $set: { images: validImages } }
            );
            console.log(`✅ Fixed: ${product.name}`);
            console.log(`   Removed ${product.images.length - validImages.length} broken image(s)`);
            console.log(`   Remaining images: ${validImages.length}`);
          }
        }

        console.log('');
        console.log('Database cleanup complete!');
      } else {
        console.log('========================================');
        console.log('To fix these issues, run:');
        console.log('node scripts/checkMissingImages.js --fix');
        console.log('========================================');
      }
    } else {
      console.log('✅ All local image files are present!');
    }

    await mongoose.disconnect();
    console.log('');
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMissingImages();
