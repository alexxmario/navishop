require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const FeedParser = require('../services/feedParser');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for image download');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    // Choose http or https based on URL
    const client = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

const getFilenameFromUrl = (url = '') => {
  if (!url) return '';
  const normalized = url.split('?')[0].split('#')[0];
  // Extract filename from URL like: https://cdnmpro.com/815608441/p/raw/1/navigatie-piloton-vw-touran-iii-dupa-2015-2k-8gb-256gb-8-core~85771.jpg
  const parts = normalized.split('/');
  return parts[parts.length - 1] || '';
};

let feedImageMap = null;

const buildFeedImageMap = async () => {
  if (feedImageMap) return feedImageMap;

  try {
    console.log('Fetching product feed to map original image URLs...');
    const parser = new FeedParser();
    const xmlData = await parser.fetchFeed();
    const feedData = await parser.parseFeed(xmlData);
    const entries = feedData.feed.entry || [];
    const array = Array.isArray(entries) ? entries : [entries];

    feedImageMap = new Map();

    const addUrlToMap = (url) => {
      if (!url) return;
      const filename = getFilenameFromUrl(url);
      if (filename) {
        feedImageMap.set(filename, url);
      }
    };

    for (const entry of array) {
      addUrlToMap(entry['g:image_link']);
      const additional = entry['g:additional_image_link'];
      if (additional) {
        const urls = Array.isArray(additional) ? additional : [additional];
        urls.forEach(addUrlToMap);
      }
    }

    console.log(`Mapped ${feedImageMap.size} image sources from feed`);
  } catch (error) {
    console.error('Unable to build feed image map:', error.message);
    feedImageMap = new Map();
  }

  return feedImageMap;
};

const isAbsoluteUrl = (url = '') => /^https?:\/\//i.test(url);

const isLocalHostUrl = (url = '') => {
  if (!url) return true;
  const localHosts = ['localhost', '127.0.0.1'];
  const additionalHosts = (process.env.LOCAL_IMAGE_HOSTS || '31.14.23.20').split(',');
  const hosts = [...localHosts, ...additionalHosts.map(h => h.trim()).filter(Boolean)];
  return hosts.some((host) => url.includes(host));
};

const resolveSourceUrl = async (imageUrl) => {
  if (!imageUrl) return null;
  if (isAbsoluteUrl(imageUrl) && !isLocalHostUrl(imageUrl)) {
    return imageUrl;
  }

  const filename = getFilenameFromUrl(imageUrl);
  if (!filename) return null;

  const map = await buildFeedImageMap();
  return map.get(filename) || null;
};

const downloadAllProductImages = async () => {
  try {
    console.log('Fetching all products from database...');
    const products = await Product.find({}, 'name images').lean();
    
    console.log(`Found ${products.length} products`);
    
    // Create target directory (allow override via env)
    const imagesDir =
      process.env.IMAGES_DIR ||
      path.join(__dirname, '../../navishop/public/images/products');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    let totalImages = 0;
    let downloadedImages = 0;
    let failedImages = 0;
    
    // Count total images first
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        totalImages += product.images.length;
      }
    }
    
    console.log(`Total images to download: ${totalImages}`);
    
    for (const product of products) {
      if (!product.images || product.images.length === 0) {
        continue;
      }
      
      console.log(`\nProcessing: ${product.name}`);
      console.log(`Images: ${product.images.length}`);
      
      for (const image of product.images) {
        const filename = getFilenameFromUrl(image.url);
        const localPath = path.join(imagesDir, filename);
        
        // Skip if file already exists
        if (fs.existsSync(localPath)) {
          console.log(`  ✓ Already exists: ${filename}`);
          downloadedImages++;
          continue;
        }
        
        try {
          const sourceUrl = await resolveSourceUrl(image.url);
          if (!sourceUrl) {
            console.warn(`  ✗ No remote URL found for ${filename}, skipping`);
            failedImages++;
            continue;
          }

          console.log(`  Downloading: ${filename}`);
          await downloadImage(sourceUrl, localPath);
          console.log(`  ✓ Downloaded: ${filename}`);
          downloadedImages++;
        } catch (error) {
          console.error(`  ✗ Failed to download ${filename}: ${error.message}`);
          failedImages++;
        }
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n=== Download Summary ===');
    console.log(`Total images: ${totalImages}`);
    console.log(`Downloaded: ${downloadedImages}`);
    console.log(`Failed: ${failedImages}`);
    console.log(`Success rate: ${((downloadedImages / totalImages) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error downloading images:', error);
  }
};

const runDownload = async () => {
  await connectDB();
  await downloadAllProductImages();
  mongoose.connection.close();
  console.log('Download completed and database connection closed.');
};

if (require.main === module) {
  runDownload();
}

module.exports = { downloadAllProductImages };
