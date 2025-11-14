require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function cleanStructuredDescriptions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    // Find products with unwanted text in structured description sections
    const products = await Product.find({
      'structuredDescription.sections': {
        $elemMatch: {
          $or: [
            { 'title': { $regex: 'multumim|ales.*produsele|NAVI-ABC', $options: 'i' } },
            { 'points': { $regex: 'multumim|ales.*produsele|NAVI-ABC', $options: 'i' } }
          ]
        }
      }
    });

    console.log(`Found ${products.length} products with unwanted text in structured sections`);

    let updatedCount = 0;
    let errorCount = 0;

    const unwantedPatterns = [
      /Va\s+mul[țt]umim\s+c[ăa]\s+a[țt]i\s+ales\s+produsele\s+NAVI-ABC[!.]?\s*/gi,
      /multumim.*ales.*produsele/gi,
      /ales.*produsele.*NAVI-ABC/gi
    ];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      try {
        console.log(`[${i + 1}/${products.length}] Processing: ${product.name.substring(0, 50)}...`);

        let updated = false;

        if (product.structuredDescription && product.structuredDescription.sections) {
          product.structuredDescription.sections.forEach((section, sectionIndex) => {
            // Clean section title
            if (section.title) {
              let originalTitle = section.title;
              let cleanedTitle = originalTitle;

              unwantedPatterns.forEach(pattern => {
                cleanedTitle = cleanedTitle.replace(pattern, '');
              });

              cleanedTitle = cleanedTitle.trim();

              if (cleanedTitle !== originalTitle) {
                section.title = cleanedTitle;
                updated = true;
                console.log(`  ✓ Cleaned section title: ${section.title}`);
              }
            }

            // Clean section points
            if (section.points && Array.isArray(section.points)) {
              section.points = section.points.map((point, pointIndex) => {
                let originalPoint = point;
                let cleanedPoint = originalPoint;

                unwantedPatterns.forEach(pattern => {
                  cleanedPoint = cleanedPoint.replace(pattern, '');
                });

                // Clean up extra whitespace
                cleanedPoint = cleanedPoint
                  .replace(/\s+/g, ' ')
                  .trim();

                if (cleanedPoint !== originalPoint) {
                  updated = true;
                  console.log(`  ✓ Cleaned point in section "${section.title}": ${cleanedPoint.substring(0, 80)}...`);
                }

                return cleanedPoint;
              }).filter(point => point.length > 0); // Remove empty points
            }
          });

          // Remove empty sections
          product.structuredDescription.sections = product.structuredDescription.sections.filter(section => {
            return section.title && section.title.trim().length > 0 &&
                   section.points && section.points.length > 0;
          });
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

    console.log('\n=== STRUCTURED CLEANUP RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('===================================\n');

    // Verify cleanup
    console.log('Verifying cleanup of structured descriptions...');
    const remainingProducts = await Product.find({
      'structuredDescription.sections': {
        $elemMatch: {
          $or: [
            { 'title': { $regex: 'multumim|ales.*produsele|NAVI-ABC', $options: 'i' } },
            { 'points': { $regex: 'multumim|ales.*produsele|NAVI-ABC', $options: 'i' } }
          ]
        }
      }
    });

    console.log(`Remaining products with unwanted text: ${remainingProducts.length}`);

    if (remainingProducts.length === 0) {
      console.log('✅ All unwanted text has been successfully removed from structured descriptions!');
    } else {
      console.log('WARNING: Some products still contain unwanted text in structured descriptions');
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
cleanStructuredDescriptions();