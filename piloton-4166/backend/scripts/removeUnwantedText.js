require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function removeUnwantedText() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Define the unwanted text patterns to remove
    const unwantedTexts = [
      'Va multumim ca ati ales produsele NAVI-ABC!',
      'Va multumim ca ati ales produsele NAVI-ABC',
      'Va mulțumim că ați ales produsele NAVI-ABC!',
      'Va mulțumim că ați ales produsele NAVI-ABC'
    ];

    console.log('Searching for products with unwanted text...');

    // Search for products containing any of the unwanted text patterns
    const searchQueries = unwantedTexts.map(text => ({
      $or: [
        { description: { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { 'structuredDescription.originalDescription': { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
      ]
    }));

    const products = await Product.find({
      $or: searchQueries
    });

    console.log(`Found ${products.length} products with unwanted text`);

    if (products.length === 0) {
      console.log('No products found with unwanted text. Checking all products for any similar patterns...');

      // Search for any products containing "multumim" or "ales" patterns
      const broadSearchProducts = await Product.find({
        $or: [
          { description: { $regex: 'multumim.*ales|ales.*produsele', $options: 'i' } },
          { 'structuredDescription.originalDescription': { $regex: 'multumim.*ales|ales.*produsele', $options: 'i' } }
        ]
      });

      console.log(`Found ${broadSearchProducts.length} products with similar patterns`);

      if (broadSearchProducts.length > 0) {
        console.log('Sample matches:');
        broadSearchProducts.slice(0, 3).forEach((product, index) => {
          console.log(`${index + 1}. ${product.name}`);
          console.log(`   Description: ${product.description.substring(0, 200)}...`);
        });
      }
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        console.log(`[${i + 1}/${products.length}] Processing: ${product.name.substring(0, 50)}...`);

        let updated = false;

        // Clean description field
        if (product.description) {
          let originalDescription = product.description;
          let cleanedDescription = originalDescription;

          // Remove all unwanted text patterns
          unwantedTexts.forEach(unwantedText => {
            const regex = new RegExp(unwantedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            cleanedDescription = cleanedDescription.replace(regex, '');
          });

          // Clean up extra whitespace and line breaks
          cleanedDescription = cleanedDescription
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

          if (cleanedDescription !== originalDescription) {
            product.description = cleanedDescription;
            updated = true;
            console.log(`  ✓ Cleaned description`);
          }
        }

        // Clean structured description if it exists
        if (product.structuredDescription && product.structuredDescription.originalDescription) {
          let originalStructured = product.structuredDescription.originalDescription;
          let cleanedStructured = originalStructured;

          // Remove all unwanted text patterns
          unwantedTexts.forEach(unwantedText => {
            const regex = new RegExp(unwantedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            cleanedStructured = cleanedStructured.replace(regex, '');
          });

          // Clean up extra whitespace
          cleanedStructured = cleanedStructured
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

          if (cleanedStructured !== originalStructured) {
            product.structuredDescription.originalDescription = cleanedStructured;
            updated = true;
            console.log(`  ✓ Cleaned structured description`);
          }
        }

        if (updated) {
          await product.save();
          updatedCount++;
          console.log(`  ✓ Product updated`);
        } else {
          console.log(`  - No changes needed`);
        }

      } catch (error) {
        console.error(`Error processing ${product.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== CLEANUP RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('=======================\n');

    // Verify cleanup by searching again
    console.log('Verifying cleanup...');
    const remainingProducts = await Product.find({
      $or: searchQueries
    });

    console.log(`Remaining products with unwanted text: ${remainingProducts.length}`);

    if (remainingProducts.length > 0) {
      console.log('WARNING: Some products still contain unwanted text:');
      remainingProducts.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Description: ${product.description.substring(0, 200)}...`);
      });
    } else {
      console.log('✓ All unwanted text has been successfully removed!');
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
removeUnwantedText();