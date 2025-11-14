const FeedParser = require('./services/feedParser');
const Product = require('./models/Product');
const mongoose = require('mongoose');

async function testLimitedSync() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/piloton');

    console.log('Testing limited sync with first 2 products...');
    const feedParser = new FeedParser();

    // Fetch and parse feed
    const xmlData = await feedParser.fetchFeed();
    const feedData = await feedParser.parseFeed(xmlData);

    // Get first 2 entries only
    const entries = feedData.feed.entry || [];
    const limitedEntries = Array.isArray(entries) ? entries.slice(0, 2) : [entries];

    console.log(`Processing ${limitedEntries.length} products...`);

    for (let i = 0; i < limitedEntries.length; i++) {
      const entry = limitedEntries[i];
      console.log(`\n--- Processing Product ${i + 1} ---`);
      console.log('Product:', entry['g:title']);
      console.log('MPN:', entry['g:mpn']);
      console.log('Link:', entry['g:link']);

      try {
        const product = await feedParser.processProduct(entry);
        console.log('Generated SKU:', product.sku);
        console.log('Romanian Specs extracted:', !!product.romanianSpecs);

        if (product.romanianSpecs) {
          console.log('  SKU in specs:', product.romanianSpecs.general?.sku);
          console.log('  Conectivitate:', product.romanianSpecs.connectivity?.conectivitate);
          console.log('  Diagonala Display:', product.romanianSpecs.display?.diagonalaDisplay);
        }

        // Save to database
        await feedParser.syncProduct(product);
        console.log('✅ Product saved to database');

      } catch (error) {
        console.error('❌ Error processing product:', error.message);
      }
    }

    console.log('\n✅ Limited sync completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

testLimitedSync();