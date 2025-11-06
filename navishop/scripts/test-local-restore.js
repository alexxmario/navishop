const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://piloton:marrrrrccccc@cluster0.uxrpy.mongodb.net/piloton?retryWrites=true&w=majority&appName=Cluster0';

// Product Schema (simplified)
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

async function testRestore() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Test with just the first chunk
    const chunkPath = path.join(__dirname, '..', 'data', 'chunks', 'chunk-001.json');

    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Chunk file not found: ${chunkPath}`);
    }

    const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
    console.log(`Processing test chunk with ${chunkData.length} products`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;

    // Process only the first 2 products from the chunk as a test
    const testProducts = chunkData.slice(0, 2);

    for (const backupProduct of testProducts) {
      console.log(`\\nProcessing: ${backupProduct.name} (slug: ${backupProduct.slug})`);

      // Skip if no structured description in backup
      if (!backupProduct.structuredDescription || !backupProduct.structuredDescription.sections) {
        console.log('  - Skipping: No structured description');
        skippedCount++;
        continue;
      }

      // Find the corresponding product in current database by slug
      const currentProduct = await Product.findOne({ slug: backupProduct.slug });

      if (currentProduct) {
        console.log('  - Found matching product in database');

        // Clean the structured description
        const cleanStructuredDescription = {
          sections: backupProduct.structuredDescription.sections.map(section => ({
            title: section.title,
            icon: section.icon,
            points: section.points
          }))
        };

        console.log(`  - Structured description has ${cleanStructuredDescription.sections.length} sections`);

        // Prepare update object
        const updateData = {
          structuredDescription: cleanStructuredDescription
        };

        // Add other specs if available
        if (backupProduct.detailedSpecs) {
          updateData.detailedSpecs = backupProduct.detailedSpecs;
          console.log('  - Added detailed specs');
        }

        if (backupProduct.displaySpecs) {
          updateData.displaySpecs = backupProduct.displaySpecs;
          console.log('  - Added display specs');
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
          console.log('  - Added Romanian specs');
        }

        // Update the product
        await Product.findByIdAndUpdate(currentProduct._id, updateData);

        updatedCount++;
        console.log('  ✅ Successfully updated product');
      } else {
        notFoundCount++;
        console.log('  ❌ Product not found in current database');
      }
    }

    console.log(`\\n📊 Test Results:`);
    console.log(`  - Products processed: ${testProducts.length}`);
    console.log(`  - Successfully updated: ${updatedCount}`);
    console.log(`  - Not found: ${notFoundCount}`);
    console.log(`  - Skipped: ${skippedCount}`);

    console.log('\\n✅ Test completed successfully! The restoration logic works.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\\nDisconnected from MongoDB');
  }
}

testRestore();