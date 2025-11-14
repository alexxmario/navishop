require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const DescriptionParser = require('../services/descriptionParser');

async function regenerateStructuredDescriptions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    console.log('Fetching all products with descriptions...');
    const products = await Product.find({
      description: { $exists: true, $ne: null }
    });

    console.log(`Found ${products.length} products with descriptions`);

    const parser = new DescriptionParser();
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        console.log(`[${i + 1}/${products.length}] Processing: ${product.name.substring(0, 50)}...`);

        // Skip if description is too short
        if (!product.description || product.description.trim().length < 50) {
          console.log(`  ⚠ Skipped - description too short`);
          skippedCount++;
          continue;
        }

        // Generate new structured description using updated parser
        const structured = parser.parseDescription(product.description);

        if (structured.sections && structured.sections.length > 0) {
          // Update the product with new structured description
          product.structuredDescription = {
            sections: structured.sections,
            originalDescription: product.description,
            parsedAt: new Date()
          };

          await product.save();
          updatedCount++;

          console.log(`  ✓ Regenerated with ${structured.sections.length} sections`);

          // Show new titles for first few products
          if (i < 3) {
            console.log(`    New section titles:`);
            structured.sections.forEach((section, index) => {
              console.log(`      ${index + 1}. ${section.title}`);
            });
          }
        } else {
          console.log(`  ⚠ No sections generated`);
          skippedCount++;
        }

        // Progress update every 50 products
        if ((i + 1) % 50 === 0) {
          console.log(`\n--- Progress Update ---`);
          console.log(`Processed: ${i + 1}/${products.length}`);
          console.log(`Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
          console.log(`----------------------\n`);
        }

      } catch (error) {
        console.error(`Error processing ${product.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== REGENERATION RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('============================\n');

    // Verify some updated products
    if (updatedCount > 0) {
      console.log('=== VERIFICATION SAMPLE ===');
      const verifyProducts = await Product.find({
        'structuredDescription.sections': { $exists: true, $ne: [] }
      }).limit(5);

      verifyProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Sections: ${product.structuredDescription.sections.length}`);
        console.log(`   Sample titles:`);
        product.structuredDescription.sections.slice(0, 3).forEach((section, sIndex) => {
          console.log(`     - ${section.title}`);
        });
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Regeneration failed:', error);
    process.exit(1);
  }
}

// Run the regeneration
regenerateStructuredDescriptions();