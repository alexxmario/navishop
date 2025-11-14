require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function removeVariationSelectors() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    const products = await Product.find({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log(`Found ${products.length} products to clean`);

    let updatedCount = 0;
    let issuesFound = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let productUpdated = false;

      if (product.structuredDescription && product.structuredDescription.sections) {
        product.structuredDescription.sections.forEach((section, sectionIndex) => {
          const originalTitle = section.title;

          // Remove variation selectors (U+FE0F = 65039) that cause display issues
          let cleanedTitle = originalTitle
            .replace(/\uFE0F/g, '') // Remove variation selector
            .replace(/[\u200B-\u200D]/g, '') // Remove other invisible characters
            .trim();

          if (cleanedTitle !== originalTitle) {
            console.log(`[${i + 1}/${products.length}] ${product.name.substring(0, 40)}...`);
            console.log(`  Section ${sectionIndex + 1}: Removed variation selector`);
            console.log(`  Before chars: [${[...originalTitle].map(c => c.charCodeAt(0)).join(', ')}]`);
            console.log(`  After chars:  [${[...cleanedTitle].map(c => c.charCodeAt(0)).join(', ')}]`);

            section.title = cleanedTitle;
            productUpdated = true;
            issuesFound++;
          }
        });
      }

      if (productUpdated) {
        await product.save();
        updatedCount++;
      }

      // Progress every 100 products
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${products.length} - Updated: ${updatedCount}, Issues: ${issuesFound}`);
      }
    }

    console.log('\n=== VARIATION SELECTOR CLEANUP RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Products updated: ${updatedCount}`);
    console.log(`Variation selectors removed: ${issuesFound}`);
    console.log('==========================================\n');

    // Verify sample after cleanup
    console.log('=== VERIFICATION SAMPLE ===');
    const verifyProduct = await Product.findOne({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    if (verifyProduct) {
      console.log(`Product: ${verifyProduct.name}`);
      verifyProduct.structuredDescription.sections.forEach((section, index) => {
        console.log(`${index + 1}. "${section.title}"`);
        console.log(`   Chars: [${[...section.title].map(c => c.charCodeAt(0)).join(', ')}]`);

        // Check for any remaining problematic characters
        const hasVariationSelector = section.title.includes('\uFE0F');
        if (hasVariationSelector) {
          console.log(`   ❌ Still contains variation selector!`);
        } else {
          console.log(`   ✅ Clean`);
        }
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

removeVariationSelectors();