require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const FeedParser = require('../services/feedParser');
const RomanianSpecsScraper = require('../services/romanianSpecsScraper');
const fs = require('fs');
const path = require('path');

async function scrapeRomanianSpecifications() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    const scraper = new RomanianSpecsScraper();
    const parser = new FeedParser();

    // Get products with external links from XML
    const xmlFilePath = path.join(__dirname, '../../navishop/public/0dd00d87fcaef80b64aa73135f2c480c.xml');
    console.log('Reading XML file...');
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

    console.log('Parsing XML data...');
    const feedData = await parser.parseFeed(xmlData);
    const processedProducts = parser.processProducts(feedData);

    console.log(`Found ${processedProducts.length} products in XML feed`);

    // Get products that have external links
    const productsWithLinks = processedProducts.filter(p => p.externalLink);
    console.log(`Found ${productsWithLinks.length} products with external links`);

    if (productsWithLinks.length === 0) {
      console.log('No products with external links found. Checking if we need to update with links...');

      // Try a few sample products to see if they need external links
      const sampleProducts = processedProducts.slice(0, 5);
      for (const product of sampleProducts) {
        console.log(`Sample: ${product.name} - External Link: ${product.externalLink}`);
      }

      console.log('You may need to update the feedParser to include external links from XML');
      return;
    }

    let scrapedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Limit to first 50 products for testing
    const productsToScrape = productsWithLinks.slice(0, 50);
    console.log(`\nScraping Romanian specifications for first ${productsToScrape.length} products...\n`);

    for (let i = 0; i < productsToScrape.length; i++) {
      const xmlProduct = productsToScrape[i];

      try {
        console.log(`\n[${i + 1}/${productsToScrape.length}] Processing: ${xmlProduct.name}`);

        // Find existing product in database
        let existingProduct = null;

        if (xmlProduct.sku) {
          existingProduct = await Product.findOne({ sku: xmlProduct.sku });
        }

        if (!existingProduct && xmlProduct.name) {
          existingProduct = await Product.findOne({ name: xmlProduct.name });
        }

        if (!existingProduct) {
          console.log(`Product not found in database: ${xmlProduct.name}`);
          skippedCount++;
          continue;
        }

        // Check if already scraped recently (within last 7 days)
        if (existingProduct.romanianSpecs && existingProduct.romanianSpecs.scrapedAt) {
          const daysSinceScraped = (Date.now() - existingProduct.romanianSpecs.scrapedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceScraped < 7) {
            console.log(`Product already scraped recently (${Math.round(daysSinceScraped)} days ago), skipping...`);
            skippedCount++;
            continue;
          }
        }

        console.log(`Scraping from: ${xmlProduct.externalLink}`);

        // Scrape the Romanian specifications
        const scrapedData = await scraper.scrapeProductWithRetry(xmlProduct.externalLink);

        if (scrapedData && scrapedData.structuredDetails) {
          // Update the product with Romanian specifications
          await Product.findByIdAndUpdate(existingProduct._id, {
            $set: {
              romanianSpecs: scrapedData.structuredDetails,
              'romanianSpecs.rawDetails': scrapedData.rawDetails,
              'romanianSpecs.scrapedAt': scrapedData.scrapedAt
            }
          });

          scrapedCount++;
          console.log(`✓ Successfully scraped ${Object.keys(scrapedData.rawDetails).length} specifications`);

          // Log some of the scraped data for verification
          if (scrapedData.structuredDetails.hardware.memorieRAM) {
            console.log(`  RAM: ${scrapedData.structuredDetails.hardware.memorieRAM}`);
          }
          if (scrapedData.structuredDetails.hardware.capacitateStocare) {
            console.log(`  Storage: ${scrapedData.structuredDetails.hardware.capacitateStocare}`);
          }
          if (scrapedData.structuredDetails.display.tehnologieDisplay) {
            console.log(`  Display: ${scrapedData.structuredDetails.display.tehnologieDisplay}`);
          }

        } else {
          console.log(`✗ Failed to scrape specifications from ${xmlProduct.externalLink}`);
          errorCount++;
        }

        // Progress update every 10 products
        if ((i + 1) % 10 === 0) {
          console.log(`\n--- Progress Update ---`);
          console.log(`Processed: ${i + 1}/${productsToScrape.length}`);
          console.log(`Scraped: ${scrapedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
          console.log(`Success rate: ${((scrapedCount / (scrapedCount + errorCount)) * 100).toFixed(1)}%`);
          console.log(`----------------------\n`);
        }

      } catch (error) {
        console.error(`Error processing ${xmlProduct.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== ROMANIAN SPECIFICATIONS SCRAPING RESULTS ===');
    console.log(`Total products processed: ${productsToScrape.length}`);
    console.log(`Successfully scraped: ${scrapedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Success rate: ${((scrapedCount / (scrapedCount + errorCount)) * 100).toFixed(1)}%`);
    console.log('================================================\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

// Run the scraping
scrapeRomanianSpecifications();