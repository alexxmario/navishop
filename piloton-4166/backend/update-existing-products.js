const mongoose = require('mongoose');
const Product = require('./models/Product');
const FeedParser = require('./services/feedParser');

async function updateExistingProductsWithLimitari() {
  try {
    await mongoose.connect('mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    const feedParser = new FeedParser();

    // Get all products from the feed
    console.log('🔍 Fetching feed...');
    const xmlData = await feedParser.fetchFeed();
    const feedData = await feedParser.parseFeed(xmlData);
    const entries = feedData.feed.entry || [];
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    console.log(`📦 Found ${entriesArray.length} products in feed`);

    let processed = 0;
    let updated = 0;
    let errors = 0;
    let limitariFound = 0;

    console.log('\n🚀 Starting to process products...');

    for (const entry of entriesArray) {
      try {
        const productTitle = entry['g:title'];
        const productLink = entry['g:link'];
        const externalId = entry['g:id'];

        processed++;

        if (processed % 100 === 0) {
          console.log(`📊 Progress: ${processed}/${entriesArray.length} (${((processed/entriesArray.length)*100).toFixed(1)}%)`);
          console.log(`   Updated: ${updated}, Limitări found: ${limitariFound}, Errors: ${errors}`);
        }

        // Find existing product in database
        let product = await Product.findOne({
          $or: [
            { externalId: externalId },
            { name: productTitle }
          ]
        });

        if (!product) {
          continue; // Skip if product not found in database
        }

        // Skip if product already has external link and limitari
        if (product.externalLink && product.romanianSpecs?.additional?.limitari) {
          continue;
        }

        // Extract specifications from the product page
        const specs = await feedParser.extractRealSpecifications(productLink);

        if (specs) {
          // Update product with external link and new specs
          const updateData = {
            externalLink: productLink,
            externalId: externalId
          };

          // Merge the new specs with existing specs
          if (specs.additional?.limitari) {
            limitariFound++;
            console.log(`✅ Found Limitări for: ${productTitle}`);
            console.log(`   Limitări: "${specs.additional.limitari.substring(0, 80)}..."`);
          }

          // Merge romanianSpecs
          updateData.romanianSpecs = {
            ...product.romanianSpecs,
            ...specs
          };

          await Product.findByIdAndUpdate(product._id, updateData);
          updated++;
        }

        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        errors++;
        console.error(`❌ Error processing ${entry['g:title']}: ${error.message}`);
      }
    }

    console.log('\n🎉 COMPLETED!');
    console.log(`📊 Final Results:`);
    console.log(`• Total products processed: ${processed}`);
    console.log(`• Products updated: ${updated}`);
    console.log(`• Products with Limitări found: ${limitariFound}`);
    console.log(`• Errors: ${errors}`);

    // Final count of products with Limitări
    const finalCount = await Product.countDocuments({
      'romanianSpecs.additional.limitari': { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`\n🎯 Total products in database with Limitări: ${finalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateExistingProductsWithLimitari();