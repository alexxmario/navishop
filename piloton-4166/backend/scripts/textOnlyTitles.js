require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function textOnlyTitles() {
  try {
    console.log('🔧 Removing emojis, using text-only titles...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    // Clean text-only titles without any emojis
    const textOnlyTitles = [
      'Montaj ușor, tip Plug & Play',
      'Integrare Vehicul',
      'CarPlay & Android Auto Wireless',
      'Teme și Interfețe Preinstalate pe Tabletă',
      'Compatibil cu cameră frontală, DVR și cameră de marșarier',
      'Sistem audio cu egalizator și Procesor DSP',
      'Sistem de navigație GPS integrat',
      'Ecran Împărțit si Multitasking',
      'Senzori de parcare, climatizare și încălzire în scaune'
    ];

    const products = await Product.find({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log(`Found ${products.length} products to update with text-only titles`);

    let updatedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      if (product.structuredDescription && product.structuredDescription.sections) {
        product.structuredDescription.sections.forEach((section, sectionIndex) => {
          if (sectionIndex < textOnlyTitles.length) {
            section.title = textOnlyTitles[sectionIndex];
          }
        });

        await product.save();
        updatedCount++;

        if (i % 200 === 0) {
          console.log(`Updated: ${i + 1}/${products.length} products`);
        }
      }
    }

    console.log(`\n✅ TEXT-ONLY TITLES COMPLETE!`);
    console.log(`📝 Products updated: ${updatedCount}`);

    // Verify
    const testProduct = await Product.findOne({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log('\n📋 NEW TEXT-ONLY TITLES:');
    testProduct.structuredDescription.sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.title}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ DONE - All titles are now text-only');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

textOnlyTitles();