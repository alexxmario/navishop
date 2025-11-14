require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const DescriptionParser = require('../services/descriptionParser');

async function updateProductsWithStructuredDescriptions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    const parser = new DescriptionParser();

    // Find products without structured descriptions
    console.log('Finding products to update...');
    const products = await Product.find({
      $and: [
        { description: { $exists: true, $ne: null, $ne: '' } },
        { $or: [
          { structuredDescription: { $exists: false } },
          { 'structuredDescription.sections': { $exists: false } },
          { 'structuredDescription.sections': { $size: 0 } }
        ]}
      ]
    }).limit(200); // Process in batches

    console.log(`Found ${products.length} products to update with structured descriptions`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        console.log(`\n[${i + 1}/${products.length}] Processing: ${product.name.substring(0, 50)}...`);

        // Skip if description is too short or not meaningful
        if (!product.description || product.description.length < 100) {
          console.log('Skipping - description too short');
          skippedCount++;
          continue;
        }

        // Parse the description
        const parsed = parser.parseDescription(product.description);

        // Only update if we got meaningful sections
        if (parsed.sections && parsed.sections.length > 0) {
          const structuredDescription = {
            sections: parsed.sections,
            originalDescription: product.description,
            parsedAt: new Date()
          };

          await Product.findByIdAndUpdate(product._id, {
            $set: { structuredDescription: structuredDescription }
          });

          successCount++;
          console.log(`✓ Created ${parsed.sections.length} sections: ${parsed.sections.map(s => s.title.replace(/[^\w\s]/g, '')).join(', ')}`);

          // Log sample sections for verification
          if (parsed.sections.length > 0) {
            const firstSection = parsed.sections[0];
            console.log(`  Sample: ${firstSection.icon} ${firstSection.title} (${firstSection.points.length} points)`);
          }

        } else {
          console.log('Skipping - no meaningful sections found');
          skippedCount++;
        }

        // Progress update every 25 products
        if ((i + 1) % 25 === 0) {
          console.log(`\n--- Progress Update ---`);
          console.log(`Processed: ${i + 1}/${products.length}`);
          console.log(`Success: ${successCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
          console.log(`Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
          console.log(`----------------------\n`);
        }

      } catch (error) {
        console.error(`Error processing ${product.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== STRUCTURED DESCRIPTIONS UPDATE RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    console.log('==============================================\n');

    // Test a few updated products
    if (successCount > 0) {
      console.log('=== SAMPLE UPDATED PRODUCTS ===');
      const updatedProducts = await Product.find({
        'structuredDescription.sections': { $exists: true, $ne: [] }
      }).limit(3);

      updatedProducts.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        if (product.structuredDescription && product.structuredDescription.sections) {
          product.structuredDescription.sections.forEach(section => {
            console.log(`   ${section.icon} ${section.title} (${section.points.length} points)`);
          });
        }
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
updateProductsWithStructuredDescriptions();