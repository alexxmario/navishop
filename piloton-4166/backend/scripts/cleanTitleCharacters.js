require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function cleanTitleCharacters() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    console.log('Finding products with potentially problematic title characters...');

    const products = await Product.find({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log(`Found ${products.length} products to check`);

    let updatedCount = 0;
    let issuesFound = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let productUpdated = false;

      if (product.structuredDescription && product.structuredDescription.sections) {
        product.structuredDescription.sections.forEach((section, sectionIndex) => {
          const originalTitle = section.title;

          // Clean the title by ensuring proper emoji and space formatting
          let cleanedTitle = originalTitle
            // Normalize emoji sequences and ensure single space after emoji
            .replace(/🔧\s*/, '🔧 ')
            .replace(/🚗\s*/, '🚗 ')
            .replace(/📱\s*/, '📱 ')
            .replace(/🎨\s*/, '🎨 ')
            .replace(/📷\s*/, '📷 ')
            .replace(/🔊\s*/, '🔊 ')
            .replace(/🗺️\s*/, '🗺️ ')
            .replace(/🎮\s*/, '🎮 ')
            .replace(/⚙️\s*/, '⚙️ ')
            // Remove any zero-width or invisible characters
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanedTitle !== originalTitle) {
            console.log(`[${i + 1}/${products.length}] ${product.name.substring(0, 40)}...`);
            console.log(`  Section ${sectionIndex + 1}: Fixed title formatting`);
            console.log(`  Before: "${originalTitle}"`);
            console.log(`  After:  "${cleanedTitle}"`);

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

    console.log('\n=== CLEANUP RESULTS ===');
    console.log(`Total products checked: ${products.length}`);
    console.log(`Products updated: ${updatedCount}`);
    console.log(`Title issues fixed: ${issuesFound}`);
    console.log('=======================\n');

    // Verify a sample after cleanup
    console.log('=== VERIFICATION SAMPLE ===');
    const verifyProduct = await Product.findOne({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    if (verifyProduct) {
      console.log(`Product: ${verifyProduct.name}`);
      verifyProduct.structuredDescription.sections.slice(0, 4).forEach((section, index) => {
        console.log(`${index + 1}. "${section.title}"`);
        console.log(`   Chars: [${[...section.title].map(c => c.charCodeAt(0)).join(', ')}]`);
      });
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanTitleCharacters();