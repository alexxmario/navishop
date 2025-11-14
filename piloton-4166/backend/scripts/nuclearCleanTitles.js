require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function nuclearCleanTitles() {
  try {
    console.log('🚀 NUCLEAR CLEAN: Completely rebuilding all section titles...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    // Define titles using basic ASCII + explicit UTF-8 Romanian chars
    const cleanTitles = [
      '\u{1F527} Montaj u\u0219or, tip Plug & Play',                        // 🔧
      '\u{1F697} Integrare Vehicul',                                         // 🚗
      '\u{1F4F1} CarPlay & Android Auto Wireless',                          // 📱
      '\u{1F3A8} Teme \u0219i Interfe\u021Be Preinstalate pe Tablet\u0103', // 🎨
      '\u{1F4F7} Compatibil cu camer\u0103 frontal\u0103, DVR \u0219i camer\u0103 de mar\u0219arier', // 📷
      '\u{1F50A} Sistem audio cu egalizator \u0219i Procesor DSP',          // 🔊
      '\u{1F5FA} Sistem de naviga\u021Bie GPS integrat',                    // 🗺 (without variation selector)
      '\u{1F3AE} Ecran \u00CEmp\u0103r\u021Bit si Multitasking',           // 🎮
      '\u{2699} Senzori de parcare, climatizare \u0219i \u00EEnc\u0103lzire \u00EEn scaune' // ⚙ (without variation selector)
    ];

    const products = await Product.find({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log(`Found ${products.length} products for NUCLEAR CLEAN`);

    let updatedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      if (product.structuredDescription && product.structuredDescription.sections) {
        // Force update every single title
        product.structuredDescription.sections.forEach((section, sectionIndex) => {
          if (sectionIndex < cleanTitles.length) {
            section.title = cleanTitles[sectionIndex];
          }
        });

        // Force update the parsedAt timestamp to break any cache
        product.structuredDescription.parsedAt = new Date();

        await product.save();
        updatedCount++;

        if (i % 100 === 0) {
          console.log(`💥 NUKED: ${i + 1}/${products.length} products`);
        }
      }
    }

    console.log(`\n💥 NUCLEAR CLEAN COMPLETE!`);
    console.log(`☢️  Products obliterated and rebuilt: ${updatedCount}`);
    console.log(`🔥 All cache-busting timestamps updated`);

    // Verify one product
    const testProduct = await Product.findOne({
      'structuredDescription.sections': { $exists: true, $ne: [] }
    });

    console.log('\n🧪 VERIFICATION:');
    console.log(`Product: ${testProduct.name}`);
    testProduct.structuredDescription.sections.forEach((section, index) => {
      console.log(`${index + 1}. "${section.title}"`);

      // Check for replacement character
      if (section.title.includes('\uFFFD') || section.title.includes('�')) {
        console.log(`   💀 STILL HAS REPLACEMENT CHARACTER!`);
      } else {
        console.log(`   ✅ CLEAN`);
      }
    });

    await mongoose.connection.close();
    console.log('\n☢️  NUCLEAR OPERATION COMPLETE - DATABASE NUKED AND REBUILT');
    process.exit(0);

  } catch (error) {
    console.error('💥 NUCLEAR MELTDOWN:', error);
    process.exit(1);
  }
}

nuclearCleanTitles();