require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function forceCleanTitles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    // Define completely clean titles with proper UTF-8 encoding
    const perfectTitles = [
      '🔧 Montaj ușor, tip Plug & Play',
      '🚗 Integrare Vehicul',
      '📱 CarPlay & Android Auto Wireless',
      '🎨 Teme și Interfețe Preinstalate pe Tabletă',
      '📷 Compatibil cu cameră frontală, DVR și cameră de marșarier',
      '🔊 Sistem audio cu egalizator și Procesor DSP',
      '🗺 Sistem de navigație GPS integrat',  // Removed ️ variation selector
      '🎮 Ecran Împărțit si Multitasking',
      '⚙ Senzori de parcare, climatizare și încălzire în scaune'  // Removed ️ variation selector
    ];

    const products = await Product.find({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log(`Found ${products.length} products to force clean`);

    let updatedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      let productUpdated = false;

      if (product.structuredDescription && product.structuredDescription.sections) {
        // Force replace all titles with perfectly clean versions
        product.structuredDescription.sections.forEach((section, sectionIndex) => {
          if (sectionIndex < perfectTitles.length) {
            const originalTitle = section.title;
            const cleanTitle = perfectTitles[sectionIndex];

            if (section.title !== cleanTitle) {
              console.log(`[${i + 1}/${products.length}] ${product.name.substring(0, 40)}...`);
              console.log(`  Section ${sectionIndex + 1}: Force replacing title`);
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

      // Progress every 100 products
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${products.length} - Updated: ${updatedCount}`);
      }
    }

    console.log('\n=== FORCE CLEAN RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Products updated: ${updatedCount}`);
    console.log('===========================\n');

    // Final verification
    console.log('=== FINAL VERIFICATION ===');
    const verifyProduct = await Product.findOne({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    if (verifyProduct) {
      console.log(`Product: ${verifyProduct.name}`);
      verifyProduct.structuredDescription.sections.forEach((section, index) => {
        console.log(`${index + 1}. "${section.title}"`);

        // Show exact character breakdown
        const chars = [...section.title];
        console.log(`   Chars: ${chars.map(c => `'${c}'(${c.charCodeAt(0)})`).join(' ')}`);

        // Check for problematic characters
        const hasProblematic = section.title.match(/[\uFE0F\uFEFF\u200B-\u200D]/);
        const hasReplacementChar = section.title.includes('�');

        if (hasProblematic || hasReplacementChar) {
          console.log(`   ❌ Still has problematic characters!`);
        } else {
          console.log(`   ✅ Perfect`);
        }
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('Force cleanup failed:', error);
    process.exit(1);
  }
}

forceCleanTitles();