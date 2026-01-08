require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Map of SKU to piloton.ro URLs
const productUrls = {
  'P5': 'https://www.piloton.ro/gps-5-inch/sistem-de-navigatie-piloton-p5.html',
  'M9Plus': 'https://www.piloton.ro/gps-7-inch/sistem-de-navigatie-piloton-m9plus.html',
  'M9Plus-9837': 'https://www.piloton.ro/gps-7-inch/sistem-de-navigatie-piloton-m9plus.html', // Same as 16GB version
  'A11S Pro': 'https://www.piloton.ro/gps-7-inch/sistem-de-navigatie-piloton-a11s-pro.html',
  'M14': 'https://www.piloton.ro/gps-7-inch/sistem-de-navigatie-piloton-m14.html',
  'A12S Pro': 'https://www.piloton.ro/gps-7-inch/sistem-de-navigatie-piloton-a12s-pro.html',
  'H12': 'https://www.piloton.ro/gps-7-inch/sistem-de-navigatie-piloton-h12.html',
  'H11': 'https://www.piloton.ro/gps-7-inch/sistem-de-navigatie-piloton-h11.html',
  'P12XL': 'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-p12xl.html',
  'M14XL': 'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-m14xl.html',
  'M10XL': 'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-m10xl.html',
  'P11XL': 'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-p11xl.html',
  'A9XL': 'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-a9xl.html',
  'A10XL': 'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-a10xl.html',
  'M8B7': null // This is a car navigation, not on piloton.ro GPS section
};

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
};

async function scrapeProductImages(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const images = [];

    // Try different selectors for product images
    const selectors = [
      '.product-image-gallery img',
      '.fotorama__stage img',
      '.gallery-placeholder img',
      '.product.media img',
      'img[data-zoom-image]',
      '.MagicToolboxContainer img'
    ];

    for (const selector of selectors) {
      $(selector).each((i, elem) => {
        let imgUrl = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-zoom-image');
        if (imgUrl) {
          // Make URL absolute
          if (imgUrl.startsWith('//')) {
            imgUrl = 'https:' + imgUrl;
          } else if (imgUrl.startsWith('/')) {
            imgUrl = 'https://www.piloton.ro' + imgUrl;
          }

          // Avoid duplicates and thumbnails
          if (!images.includes(imgUrl) && !imgUrl.includes('/thumbnail/') && !imgUrl.includes('_thumb')) {
            images.push(imgUrl);
          }
        }
      });

      if (images.length > 0) break;
    }

    return images;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return [];
  }
}

async function downloadGpsImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/piloton');
    console.log('Connected to MongoDB\n');

    // Create images directory if it doesn't exist
    const imagesDir = path.join(__dirname, '../../navishop/public/images/products');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const products = await Product.find({ category: 'gps', status: 'active' }).sort({ sku: 1 });
    console.log(`Found ${products.length} GPS products\n`);

    for (const product of products) {
      const sku = product.sku;
      const url = productUrls[sku];

      if (!url) {
        console.log(`⏭️  ${sku}: No piloton.ro URL mapped, skipping`);
        continue;
      }

      console.log(`\n📦 ${sku} - ${product.name}`);
      console.log(`   URL: ${url}`);

      // Scrape images
      const imageUrls = await scrapeProductImages(url);
      console.log(`   Found ${imageUrls.length} images`);

      if (imageUrls.length === 0) {
        console.log(`   ❌ No images found`);
        continue;
      }

      // Download images
      const productImages = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imgUrl = imageUrls[i];
        const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
        const filename = `${sku}-${i}${ext}`;
        const filepath = path.join(imagesDir, filename);

        try {
          console.log(`   Downloading image ${i + 1}/${imageUrls.length}...`);
          await downloadImage(imgUrl, filepath);

          productImages.push({
            url: `/images/products/${filename}`,
            alt: `${product.name} - Image ${i + 1}`,
            isPrimary: i === 0
          });

          console.log(`   ✅ Saved: ${filename}`);
        } catch (error) {
          console.log(`   ❌ Failed to download: ${error.message}`);
        }

        // Add delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update product with images
      if (productImages.length > 0) {
        product.images = productImages;
        await product.save();
        console.log(`   💾 Updated product with ${productImages.length} images`);
      }
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

downloadGpsImages();
