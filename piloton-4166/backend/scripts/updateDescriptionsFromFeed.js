require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const FeedParser = require('../services/feedParser');

async function updateProductDescriptions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    console.log('Fetching feed data...');
    const feedParser = new FeedParser();
    const feedData = await feedParser.fetchFeed();
    const parsedFeed = await feedParser.parseFeed(feedData);
    const products = feedParser.processProducts(parsedFeed);

    console.log(`Found ${products.length} products in feed`);

    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < products.length; i++) {
      const feedProduct = products[i];

      try {
        console.log(`[${i + 1}/${products.length}] Updating: ${feedProduct.name.substring(0, 50)}...`);

        // Find product by external ID or name
        const existingProduct = await Product.findOne({
          $or: [
            { externalId: feedProduct.externalId },
            { name: feedProduct.name }
          ]
        });

        if (existingProduct) {
          // Update only the description field with full content
          await Product.findByIdAndUpdate(existingProduct._id, {
            $set: {
              description: feedProduct.description,
              // Clear structured description so it gets regenerated
              structuredDescription: undefined
            }
          });

          console.log(`✓ Updated description (${feedProduct.description.length} chars)`);
          updatedCount++;
        } else {
          console.log('⚠ Product not found in database');
        }

        // Progress update every 100 products
        if ((i + 1) % 100 === 0) {
          console.log(`\n--- Progress Update ---`);
          console.log(`Processed: ${i + 1}/${products.length}`);
          console.log(`Updated: ${updatedCount}, Errors: ${errorCount}`);
          console.log(`----------------------\n`);
        }

      } catch (error) {
        console.error(`Error updating ${feedProduct.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== DESCRIPTION UPDATE RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('================================\n');

    // Test a few updated products
    if (updatedCount > 0) {
      console.log('=== SAMPLE UPDATED DESCRIPTIONS ===');
      const updatedProducts = await Product.find({
        description: { $exists: true, $ne: null }
      }).limit(3);

      updatedProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Description length: ${product.description.length} characters`);
        console.log(`   Sample: ${product.description.substring(0, 100)}...`);
      });
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateProductDescriptions();