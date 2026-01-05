require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Category URLs to scrape
const CATEGORIES = [
  'http://www.piloton.ro/gps-5-inch',
  'http://www.piloton.ro/gps-7-inch',
  'http://www.piloton.ro/gps-9-inch',
  'http://www.piloton.ro/navigatii-auto-android'
];

// Configuration
const RATE_LIMIT_MS = 2000; // 2 seconds between product requests
const IMAGE_RATE_LIMIT_MS = 500; // 500ms between image downloads
const MAX_RETRIES = 3;
const IMAGE_DIR = path.join(__dirname, '../public/images/products/piloton');

// Romanian character mapping for slug generation
const ROMANIAN_CHAR_MAP = {
  'ă': 'a', 'Ă': 'A',
  'â': 'a', 'Â': 'A',
  'î': 'i', 'Î': 'I',
  'ș': 's', 'Ș': 'S',
  'ț': 't', 'Ț': 'T'
};

// Utility: Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: HTTP request with retry logic
async function retryRequest(url, options = {}, maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PilotOnBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8'
        },
        ...options
      });
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`⚠️  Request failed, retrying... (${i + 1}/${maxRetries})`);
      await sleep(2000 * (i + 1)); // Exponential backoff
    }
  }
}

// Generate URL-safe slug from Romanian text
function generateSlug(name) {
  let slug = name.toLowerCase();

  // Replace Romanian characters
  Object.keys(ROMANIAN_CHAR_MAP).forEach(char => {
    slug = slug.replace(new RegExp(char, 'g'), ROMANIAN_CHAR_MAP[char].toLowerCase());
  });

  // Remove special chars, normalize spaces
  return slug
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Ensure slug is unique in database
async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;

  while (await Product.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// Fetch category page and extract product URLs
async function fetchCategoryPage(categoryUrl) {
  console.log(`\n📂 Fetching category: ${categoryUrl}`);

  try {
    const response = await retryRequest(categoryUrl);
    const $ = cheerio.load(response.data);
    const productUrls = [];

    // Find product links - adjust selector based on actual HTML structure
    $('a[href*=".html"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('/category/') && !href.includes('/categorie/')) {
        const fullUrl = href.startsWith('http') ? href : `http://www.piloton.ro${href}`;
        if (fullUrl.includes('piloton.ro/gps-') || fullUrl.includes('piloton.ro/navigatii-')) {
          if (!productUrls.includes(fullUrl)) {
            productUrls.push(fullUrl);
          }
        }
      }
    });

    console.log(`✓ Found ${productUrls.length} products in category`);
    return productUrls;
  } catch (error) {
    console.error(`✗ Failed to fetch category ${categoryUrl}:`, error.message);
    return [];
  }
}

// Extract JSON-LD structured data from page
function extractJsonLd(html) {
  const $ = cheerio.load(html);
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const structuredData = [];

  jsonLdScripts.each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      structuredData.push(data);
    } catch (error) {
      // Skip invalid JSON
    }
  });

  return structuredData;
}

// Extract product data from product page
async function scrapeProductPage(productUrl) {
  console.log(`\n🔍 Scraping: ${productUrl}`);

  try {
    const response = await retryRequest(productUrl);
    const html = response.data;
    const $ = cheerio.load(html);
    const jsonLdData = extractJsonLd(html);

    // Find Product schema from JSON-LD
    const productSchema = jsonLdData.find(item => item['@type'] === 'Product');

    if (!productSchema) {
      console.warn('⚠️  No Product schema found, falling back to HTML parsing');
    }

    // Extract basic data
    const name = productSchema?.name || $('h1').first().text().trim();
    const sku = productSchema?.sku || $('.product-code').text().trim() || '';
    const price = productSchema?.offers?.price || parseFloat($('.product-price').text().replace(/[^0-9.]/g, '')) || 0;
    const description = productSchema?.description || $('.product-description').html() || '';

    // Extract images
    const images = [];
    if (productSchema?.image) {
      if (Array.isArray(productSchema.image)) {
        images.push(...productSchema.image);
      } else {
        images.push(productSchema.image);
      }
    }

    // Fallback: find images in HTML
    if (images.length === 0) {
      $('.product-image img, .product-gallery img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.includes('placeholder')) {
          images.push(src.startsWith('http') ? src : `http://www.piloton.ro${src}`);
        }
      });
    }

    // Extract specifications from table
    const specifications = [];
    $('table tr, .specifications tr, .specs-table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (key && value) {
          specifications.push({ key, value });
        }
      }
    });

    // Extract stock availability
    const availability = productSchema?.offers?.availability || '';
    const inStock = availability.includes('InStock') || $('.in-stock').length > 0;

    // Extract ratings
    const aggregateRating = productSchema?.aggregateRating || {};
    const averageRating = parseFloat(aggregateRating.ratingValue) || 0;
    const totalReviews = parseInt(aggregateRating.reviewCount) || 0;

    // Determine subcategory from URL or name
    let subcategory = '';
    if (productUrl.includes('gps-5-inch') || name.toLowerCase().includes('5 inch')) {
      subcategory = '5-inch';
    } else if (productUrl.includes('gps-7-inch') || name.toLowerCase().includes('7 inch')) {
      subcategory = '7-inch';
    } else if (productUrl.includes('gps-9-inch') || name.toLowerCase().includes('9 inch')) {
      subcategory = '9-inch';
    } else if (productUrl.includes('android') || name.toLowerCase().includes('android')) {
      subcategory = 'android';
    }

    console.log(`✓ Extracted: ${name} (${sku})`);

    return {
      name,
      sku: sku || `PO-${Date.now()}`,
      price,
      description,
      images,
      specifications,
      subcategory,
      inStock,
      averageRating,
      totalReviews,
      sourceUrl: productUrl
    };
  } catch (error) {
    console.error(`✗ Failed to scrape ${productUrl}:`, error.message);
    throw error;
  }
}

// Download images to local storage
async function downloadProductImages(product, imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    console.warn(`⚠️  No images to download for ${product.sku}`);
    return [];
  }

  // Ensure directory exists
  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const downloadedImages = [];

  for (let i = 0; i < Math.min(imageUrls.length, 4); i++) {
    let imageUrl = imageUrls[i];

    // Handle different image URL formats (string or object)
    if (typeof imageUrl === 'object' && imageUrl !== null) {
      // If it's an object, try common properties
      imageUrl = imageUrl.url || imageUrl.contentUrl || imageUrl['@id'] || '';
    }

    // Convert to string and trim
    imageUrl = String(imageUrl).trim();

    if (!imageUrl) {
      console.warn(`  ⚠️  Empty image URL at index ${i}, skipping...`);
      continue;
    }

    // Make sure URL is absolute
    if (!imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('/')
        ? `http://www.piloton.ro${imageUrl}`
        : `http://www.piloton.ro/${imageUrl}`;
    }

    try {
      const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
      const filename = `${product.sku.replace(/\s+/g, '-')}-${i}${ext}`;
      const filepath = path.join(IMAGE_DIR, filename);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      await fs.writeFile(filepath, response.data);

      downloadedImages.push({
        url: `/images/products/piloton/${filename}`,
        alt: `${product.name} - Imagine ${i + 1}`,
        isPrimary: i === 0
      });

      console.log(`  ✓ Downloaded image ${i + 1}/${imageUrls.length}`);

      // Rate limit image downloads
      if (i < imageUrls.length - 1) {
        await sleep(IMAGE_RATE_LIMIT_MS);
      }
    } catch (error) {
      console.error(`  ✗ Failed to download image ${imageUrl}:`, error.message);
    }
  }

  return downloadedImages;
}

// Map scraped data to Product schema
function mapToProductSchema(scrapedData, downloadedImages) {
  // Parse specifications into structured format
  const detailedSpecs = {};
  const displaySpecs = {};
  const romanianSpecs = {
    general: {},
    hardware: {},
    display: {},
    connectivity: {},
    features: {},
    package: {},
    compatibility: {},
    scrapedAt: new Date()
  };

  // Map specifications
  scrapedData.specifications.forEach(spec => {
    const key = spec.key.toLowerCase();
    const value = spec.value;

    // Processor
    if (key.includes('procesor') || key.includes('processor')) {
      detailedSpecs.processor = value;
      romanianSpecs.hardware.modelProcesor = value;
    }

    // RAM
    if (key.includes('ram') || key.includes('memorie')) {
      detailedSpecs.ram = value;
      romanianSpecs.hardware.memorieRAM = value;
    }

    // Storage
    if (key.includes('stocare') || key.includes('storage') || key.includes('memorie interna')) {
      detailedSpecs.storage = value;
      romanianSpecs.hardware.capacitateStocare = value;
    }

    // Display
    if (key.includes('diagonala') || key.includes('ecran') || key.includes('display')) {
      displaySpecs.screenSize = value;
      romanianSpecs.display.diagonalaDisplay = value;
    }

    if (key.includes('rezolutie') || key.includes('resolution')) {
      displaySpecs.resolution = value;
      romanianSpecs.display.rezolutieDisplay = value;
    }

    if (key.includes('tehnologie') || key.includes('technology')) {
      displaySpecs.technology = value;
      romanianSpecs.display.tehnologieDisplay = value;
    }

    // Connectivity
    if (key.includes('bluetooth') || key.includes('wifi') || key.includes('conectivitate')) {
      romanianSpecs.connectivity.conectivitate = value;
    }

    // Operating system
    if (key.includes('sistem') || key.includes('os')) {
      romanianSpecs.general.sistemOperare = value;
    }
  });

  // Generate slug
  const baseSlug = generateSlug(scrapedData.name);

  // Map compatibility - PilotOn GPS devices are universal
  const compatibility = [
    {
      brand: 'Universal',
      model: 'TIR, Camioane, Autoturisme',
      models: ['TIR', 'Camion', 'Autoturism'],
      years: []
    }
  ];

  return {
    name: scrapedData.name,
    slug: baseSlug, // Will be made unique before insertion
    description: scrapedData.description,
    shortDescription: scrapedData.name.substring(0, 200),
    category: 'gps',
    subcategory: scrapedData.subcategory,
    brand: 'PilotOn',
    model: scrapedData.sku,
    sku: scrapedData.sku,
    price: scrapedData.price,
    stock: scrapedData.inStock ? 10 : 0,
    lowStockThreshold: 5,
    images: downloadedImages,
    specifications: scrapedData.specifications,
    compatibility,
    features: [],
    inTheBox: [],
    detailedSpecs,
    displaySpecs,
    romanianSpecs,
    warranty: 24, // 2 years warranty typical for electronics
    status: 'active',
    featured: false,
    newProduct: true,
    averageRating: scrapedData.averageRating,
    totalReviews: scrapedData.totalReviews,
    viewCount: 0
  };
}

// Save product to database
async function saveProduct(productData) {
  try {
    // Ensure unique slug
    productData.slug = await ensureUniqueSlug(productData.slug);

    // Upsert product (update if exists, insert if new)
    const product = await Product.findOneAndUpdate(
      { sku: productData.sku },
      productData,
      { upsert: true, new: true, runValidators: true }
    );

    console.log(`✅ Saved: ${productData.name} (${productData.sku})`);
    return product;
  } catch (error) {
    console.error(`❌ Failed to save ${productData.sku}:`, error.message);
    throw error;
  }
}

// Main scraping orchestrator
async function scrapeAllProducts() {
  console.log('🚀 Starting PilotOn product scraper...\n');
  console.log('=' .repeat(60));

  const allProductUrls = [];
  const scrapedProducts = [];
  const errors = [];

  // Step 1: Gather all product URLs from categories
  for (const categoryUrl of CATEGORIES) {
    const productUrls = await fetchCategoryPage(categoryUrl);
    allProductUrls.push(...productUrls);
    await sleep(RATE_LIMIT_MS);
  }

  // Remove duplicates
  const uniqueUrls = [...new Set(allProductUrls)];
  console.log(`\n📋 Total unique products found: ${uniqueUrls.length}`);
  console.log('=' .repeat(60));

  // Step 2: Scrape each product
  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    console.log(`\n[${i + 1}/${uniqueUrls.length}]`);

    try {
      // Scrape product data
      const scrapedData = await scrapeProductPage(url);

      // Download images
      console.log(`📸 Downloading images for ${scrapedData.sku}...`);
      const downloadedImages = await downloadProductImages(scrapedData, scrapedData.images);

      // Map to schema
      const productData = mapToProductSchema(scrapedData, downloadedImages);

      scrapedProducts.push(productData);

      // Rate limit between products
      if (i < uniqueUrls.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error.message);
      errors.push({ url, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Scraping completed: ${scrapedProducts.length}/${uniqueUrls.length} products`);

  if (errors.length > 0) {
    console.log(`⚠️  Errors: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err.url}: ${err.error}`));
  }

  return scrapedProducts;
}

// Save all products to database
async function saveAllProducts(products) {
  console.log('\n💾 Saving products to database...\n');
  console.log('='.repeat(60));

  let successCount = 0;
  let errorCount = 0;

  for (const productData of products) {
    try {
      await saveProduct(productData);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to save ${productData.sku}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Saved: ${successCount} products`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} products`);
  }
}

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    // Connect to database
    await connectDB();

    // Scrape all products
    const products = await scrapeAllProducts();

    // Save to database
    if (products.length > 0) {
      await saveAllProducts(products);
    } else {
      console.log('⚠️  No products scraped. Exiting...');
    }

    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🏁 Scraping completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { scrapeAllProducts, scrapeProductPage, mapToProductSchema };
