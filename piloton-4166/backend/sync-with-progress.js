const FeedParser = require('./services/feedParser');
const Product = require('./models/Product');
const mongoose = require('mongoose');

async function syncWithProgress() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/piloton');

    console.log('📡 Fetching product feed from XML...');
    const feedParser = new FeedParser();

    // Fetch and parse feed
    const xmlData = await feedParser.fetchFeed();
    const feedData = await feedParser.parseFeed(xmlData);

    const entries = feedData.feed.entry || [];
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    console.log(`📦 Found ${entriesArray.length} products in XML feed`);
    console.log('🚀 Starting specification extraction and database sync...\n');

    let processed = 0;
    let updated = 0;
    let created = 0;
    let errors = 0;

    // Process in batches to avoid overwhelming the system
    const batchSize = 50;
    const totalBatches = Math.ceil(entriesArray.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, entriesArray.length);
      const batch = entriesArray.slice(start, end);

      console.log(`\n📊 Processing batch ${batchIndex + 1}/${totalBatches} (Products ${start + 1}-${end})`);

      for (const entry of batch) {
        try {
          processed++;
          const title = entry['g:title'];
          const externalId = entry['g:id'];

          // Process the product with real specifications
          const productData = await feedParser.processProduct(entry);

          // Check if product exists
          let product = await Product.findOne({ externalId: productData.externalId });
          if (!product && productData.slug) {
            product = await Product.findOne({ slug: productData.slug });
          }

          if (product) {
            // Update existing product
            Object.assign(product, productData);
            product.updatedAt = new Date();
            await product.save();
            updated++;
            console.log(`✅ Updated: ${title.substring(0, 60)}...`);
          } else {
            // Create new product
            product = new Product({
              ...productData,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            await product.save();
            created++;
            console.log(`➕ Created: ${title.substring(0, 60)}...`);
          }

          // Show real specifications that were extracted
          if (productData.romanianSpecs) {
            console.log(`   📋 SKU: ${productData.romanianSpecs.general?.sku || 'N/A'}`);
            console.log(`   💾 RAM: ${productData.romanianSpecs.hardware?.memorieRAM || 'N/A'} | Storage: ${productData.romanianSpecs.hardware?.capacitateStocare || 'N/A'}`);
            console.log(`   📱 Display: ${productData.romanianSpecs.display?.diagonalaDisplay || 'N/A'} ${productData.romanianSpecs.display?.tehnologieDisplay || ''}`);
            console.log(`   🔗 Connectivity: ${(productData.romanianSpecs.connectivity?.conectivitate || '').substring(0, 50)}...`);
          }

        } catch (error) {
          errors++;
          console.error(`❌ Error processing product ${processed}: ${error.message}`);
        }

        // Show progress every 10 products
        if (processed % 10 === 0) {
          const percentage = ((processed / entriesArray.length) * 100).toFixed(1);
          console.log(`\n📈 Progress: ${processed}/${entriesArray.length} (${percentage}%) | ✅ Updated: ${updated} | ➕ Created: ${created} | ❌ Errors: ${errors}\n`);
        }
      }

      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 === SYNC COMPLETED ===');
    console.log(`📊 Total processed: ${processed}`);
    console.log(`✅ Products updated: ${updated}`);
    console.log(`➕ Products created: ${created}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`🎯 Success rate: ${(((updated + created) / processed) * 100).toFixed(1)}%`);

    process.exit(0);

  } catch (error) {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  }
}

syncWithProgress();