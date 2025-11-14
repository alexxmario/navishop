require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const FeedParser = require('../services/feedParser');
const DescriptionParser = require('../services/descriptionParser');

async function fixAllDescriptions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    console.log('Fetching feed data...');
    const feedParser = new FeedParser();
    const feedData = await feedParser.fetchFeed();
    const parsedFeed = await feedParser.parseFeed(feedData);
    const feedProducts = feedParser.processProducts(parsedFeed);

    console.log(`Found ${feedProducts.length} products in feed`);

    // Create a map of feed products by name for quick lookup
    const feedMap = new Map();
    feedProducts.forEach(product => {
      feedMap.set(product.name, product);
    });

    // Find all products with old descriptions
    const oldProducts = await Product.find({
      description: { $regex: /^Unboxing Tableta/, $options: 'i' }
    });

    console.log(`Found ${oldProducts.length} products with old descriptions`);

    const parser = new DescriptionParser();
    let updatedCount = 0;
    let processedCount = 0;

    for (let i = 0; i < oldProducts.length; i++) {
      const dbProduct = oldProducts[i];
      processedCount++;

      try {
        console.log(`[${i + 1}/${oldProducts.length}] Processing: ${dbProduct.name.substring(0, 50)}...`);

        // Find matching product in feed
        const feedProduct = feedMap.get(dbProduct.name);

        if (feedProduct) {
          // Update description from feed
          dbProduct.description = feedProduct.description;
          console.log(`  ✓ Updated description from feed`);
        } else {
          console.log(`  ⚠ No matching feed product found, using existing description`);
        }

        // Generate structured description
        const structured = parser.parseDescription(dbProduct.description);

        if (structured.sections && structured.sections.length > 0) {
          dbProduct.structuredDescription = {
            sections: structured.sections,
            originalDescription: dbProduct.description,
            parsedAt: new Date()
          };

          await dbProduct.save();
          updatedCount++;

          console.log(`  ✓ Created ${structured.sections.length} sections`);
        } else {
          console.log(`  ⚠ No sections generated`);
        }

        // Progress update every 25 products
        if (processedCount % 25 === 0) {
          console.log(`\n--- Progress ---`);
          console.log(`Processed: ${processedCount}/${oldProducts.length}`);
          console.log(`Updated: ${updatedCount}`);
          console.log(`---------------\n`);
        }

      } catch (error) {
        console.error(`Error processing ${dbProduct.name}:`, error.message);
      }
    }

    console.log('\n=== FINAL RESULTS ===');
    console.log(`Total products processed: ${processedCount}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log('=====================\n');

    // Verify some updated products
    const verifyProducts = await Product.find({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    }).limit(3);

    console.log('=== VERIFICATION ===');
    verifyProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Sections: ${product.structuredDescription.sections.length}`);
      console.log(`   Description starts: ${product.description.substring(0, 80)}...`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  }
}

fixAllDescriptions();