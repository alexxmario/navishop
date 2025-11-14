require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function aggressiveCleanTitles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    // Define the exact clean titles we want
    const cleanTitles = {
      'packageInstallation': '🔧 Montaj ușor, tip Plug & Play',
      'vehicleIntegration': '🚗 Integrare Vehicul',
      'smartConnectivity': '📱 CarPlay & Android Auto Wireless',
      'displayHardware': '🎨 Teme și Interfețe Preinstalate pe Tabletă',
      'cameraSupport': '📷 Compatibil cu cameră frontală, DVR și cameră de marșarier',
      'audioSound': '🔊 Sistem audio cu egalizator și Procesor DSP',
      'navigation': '🗺️ Sistem de navigație GPS integrat',
      'advancedFeatures': '🎮 Ecran Împărțit si Multitasking',
      'autoIntegration': '⚙️ Senzori de parcare, climatizare și încălzire în scaune'
    };

    // Map of section order to keys
    const sectionKeys = [
      'packageInstallation',
      'vehicleIntegration',
      'smartConnectivity',
      'displayHardware',
      'cameraSupport',
      'audioSound',
      'navigation',
      'advancedFeatures',
      'autoIntegration'
    ];

    const products = await Product.find({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log(`Found ${products.length} products to clean`);

    let updatedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let productUpdated = false;

      if (product.structuredDescription && product.structuredDescription.sections) {
        // Go through each section and replace title with clean version
        product.structuredDescription.sections.forEach((section, sectionIndex) => {
          const originalTitle = section.title;

          // Get the expected clean title for this section position
          if (sectionIndex < sectionKeys.length) {
            const sectionKey = sectionKeys[sectionIndex];
            const cleanTitle = cleanTitles[sectionKey];

            if (cleanTitle && section.title !== cleanTitle) {
              console.log(`[${i + 1}/${products.length}] ${product.name.substring(0, 40)}...`);
              console.log(`  Section ${sectionIndex + 1}: Replacing title`);
              console.log(`  Before: "${originalTitle}"`);
              console.log(`  After:  "${cleanTitle}"`);

              section.title = cleanTitle;
              productUpdated = true;
            }
          }
        });
      }

      if (productUpdated) {
        await product.save();
        updatedCount++;
      }

      // Progress every 50 products
      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${products.length} - Updated: ${updatedCount}`);
      }
    }

    console.log('\n=== AGGRESSIVE CLEANUP RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Products updated: ${updatedCount}`);
    console.log('==================================\n');

    // Verify sample after cleanup
    console.log('=== VERIFICATION SAMPLE ===');
    const verifyProduct = await Product.findOne({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    if (verifyProduct) {
      console.log(`Product: ${verifyProduct.name}`);
      verifyProduct.structuredDescription.sections.forEach((section, index) => {
        console.log(`${index + 1}. "${section.title}"`);
        // Show each character and its code
        const chars = [...section.title];
        console.log(`   Characters: ${chars.map(c => `'${c}'(${c.charCodeAt(0)})`).join(' ')}`);
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

aggressiveCleanTitles();