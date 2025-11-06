const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alexionescu870_db_user:aw86FMaGMinRVfR6@piloton.nkt2m6j.mongodb.net/piloton?retryWrites=true&w=majority&appName=PilotOn';

const ProductSchema = new mongoose.Schema({
  name: String,
  slug: { type: String, unique: true },
  description: String,
  category: String,
  brand: String,
  price: Number,
  structuredDescription: {
    sections: [{
      title: String,
      icon: String,
      points: [String]
    }]
  },
  detailedSpecs: mongoose.Schema.Types.Mixed,
  displaySpecs: mongoose.Schema.Types.Mixed,
  romanianSpecs: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function restoreAllChunks() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    const chunksDir = path.join(__dirname, '..', 'data', 'chunks');
    const chunkFiles = fs.readdirSync(chunksDir).filter(file => file.startsWith('chunk-') && file.endsWith('.json'));

    console.log(`📦 Found ${chunkFiles.length} chunk files to process`);

    let totalUpdated = 0;
    let totalNotFound = 0;
    let totalSkipped = 0;
    let totalProcessed = 0;

    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkFile = chunkFiles[i];
      const chunkNumber = i + 1;

      console.log(`\n🔄 Processing ${chunkFile} (${chunkNumber}/${chunkFiles.length})...`);

      const chunkPath = path.join(chunksDir, chunkFile);
      const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));

      let chunkUpdated = 0;
      let chunkNotFound = 0;
      let chunkSkipped = 0;

      for (const backupProduct of chunkData) {
        totalProcessed++;

        if (!backupProduct.structuredDescription || !backupProduct.structuredDescription.sections) {
          chunkSkipped++;
          continue;
        }

        const currentProduct = await Product.findOne({ slug: backupProduct.slug });

        if (currentProduct) {
          const cleanStructuredDescription = {
            sections: backupProduct.structuredDescription.sections.map(section => ({
              title: section.title,
              icon: section.icon,
              points: section.points
            }))
          };

          const updateData = {
            structuredDescription: cleanStructuredDescription
          };

          if (backupProduct.detailedSpecs) {
            updateData.detailedSpecs = backupProduct.detailedSpecs;
          }

          if (backupProduct.displaySpecs) {
            updateData.displaySpecs = backupProduct.displaySpecs;
          }

          if (backupProduct.romanianSpecs) {
            updateData.romanianSpecs = {
              hardware: backupProduct.romanianSpecs.hardware || {},
              display: backupProduct.romanianSpecs.display || {},
              connectivity: backupProduct.romanianSpecs.connectivity || {},
              features: backupProduct.romanianSpecs.features || {},
              package: backupProduct.romanianSpecs.package || {},
              compatibility: backupProduct.romanianSpecs.compatibility || {},
              general: backupProduct.romanianSpecs.general || {},
              additional: backupProduct.romanianSpecs.additional || {},
              rawDetails: backupProduct.romanianSpecs.rawDetails || {}
            };
          }

          await Product.findByIdAndUpdate(currentProduct._id, updateData);
          chunkUpdated++;

          // Show progress for Volvo and Ford products specifically
          if (backupProduct.brand?.toLowerCase().includes('volvo') ||
              backupProduct.name?.toLowerCase().includes('volvo') ||
              backupProduct.name?.toLowerCase().includes('ford transit')) {
            console.log(`  ✅ Updated ${backupProduct.brand || 'Unknown'}: ${backupProduct.name}`);
          }
        } else {
          chunkNotFound++;
        }
      }

      totalUpdated += chunkUpdated;
      totalNotFound += chunkNotFound;
      totalSkipped += chunkSkipped;

      console.log(`  📊 Chunk ${chunkNumber} results: ${chunkUpdated} updated, ${chunkNotFound} not found, ${chunkSkipped} skipped`);
    }

    console.log(`\n🎉 All chunks restoration completed!`);
    console.log(`📊 Final Results:`);
    console.log(`  - Total products processed: ${totalProcessed}`);
    console.log(`  - Total products updated: ${totalUpdated}`);
    console.log(`  - Total products not found: ${totalNotFound}`);
    console.log(`  - Total products skipped: ${totalSkipped}`);
    console.log(`\n✅ Restoration successful! All Volvo and Ford Transit products should now have beautiful descriptions.`);

  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

restoreAllChunks();