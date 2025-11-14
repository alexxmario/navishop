require('dotenv').config();
const mongoose = require('mongoose');
const FeedParser = require('../services/feedParser');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

async function updateExistingProductsWithSpecs() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    const parser = new FeedParser();

    // Read XML file directly
    const xmlFilePath = path.join(__dirname, '../../navishop/public/0dd00d87fcaef80b64aa73135f2c480c.xml');
    console.log('Reading XML file...');
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

    console.log('Parsing XML data...');
    const feedData = await parser.parseFeed(xmlData);
    const processedProducts = parser.processProducts(feedData);

    console.log(`Found ${processedProducts.length} products in XML feed`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    console.log('Starting to update existing products with enhanced specs...\n');

    for (const xmlProduct of processedProducts) {
      try {
        // Try to find existing product by multiple criteria
        let existingProduct = null;

        // First, try by external ID if it exists
        if (xmlProduct.externalId) {
          existingProduct = await Product.findOne({ externalId: xmlProduct.externalId });
        }

        // If not found, try by SKU (generated from external ID and brand)
        if (!existingProduct && xmlProduct.sku) {
          existingProduct = await Product.findOne({ sku: xmlProduct.sku });
        }

        // If still not found, try by name similarity
        if (!existingProduct && xmlProduct.name) {
          existingProduct = await Product.findOne({ name: xmlProduct.name });
        }

        // If still not found, try by slug
        if (!existingProduct && xmlProduct.slug) {
          existingProduct = await Product.findOne({ slug: xmlProduct.slug });
        }

        if (existingProduct) {
          // Update the existing product with enhanced specifications
          const updateData = {
            detailedSpecs: xmlProduct.detailedSpecs || {},
            displaySpecs: xmlProduct.displaySpecs || {},
            technicalFeatures: xmlProduct.technicalFeatures || [],
            connectivityOptions: xmlProduct.connectivityOptions || [],
            externalId: xmlProduct.externalId, // Add external ID for future syncs
            updatedAt: new Date()
          };

          // Only update if we have enhanced specs to add
          if (Object.keys(updateData.detailedSpecs).length > 0 ||
              Object.keys(updateData.displaySpecs).length > 0 ||
              updateData.technicalFeatures.length > 0 ||
              updateData.connectivityOptions.length > 0) {

            await Product.findByIdAndUpdate(existingProduct._id, updateData, { new: true });
            updated++;

            if (updated % 100 === 0) {
              console.log(`Updated ${updated} products so far...`);
            }
          }
        } else {
          notFound++;
          console.log(`Product not found: ${xmlProduct.name} (SKU: ${xmlProduct.sku})`);
        }

      } catch (error) {
        console.error(`Error updating product ${xmlProduct.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== UPDATE RESULTS ===');
    console.log(`Total XML products: ${processedProducts.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Not found: ${notFound}`);
    console.log(`Errors: ${errors}`);
    console.log('=====================\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateExistingProductsWithSpecs();