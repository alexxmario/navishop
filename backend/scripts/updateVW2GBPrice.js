const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config();

async function updateVW2GBPrice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Find VW/Volkswagen products that mention 2GB anywhere relevant
    const vwProducts = await Product.find({
      $or: [
        { brand: { $regex: /^VW$/i } },
        { brand: { $regex: /^Volkswagen$/i } },
        { name: { $regex: /VW|Volkswagen/i } }
      ]
    });

    console.log(`Found ${vwProducts.length} VW/Volkswagen products total`);

    const TARGET_PRICE = 799;
    const updated = [];
    const skipped = [];

    for (const product of vwProducts) {
      const imageCount = product.images ? product.images.length : 0;

      // Check if the product is a 2GB variant
      const name = product.name || '';
      const ram = (product.detailedSpecs && product.detailedSpecs.ram) || '';
      const memorieRAM = (product.romanianSpecs && product.romanianSpecs.hardware && product.romanianSpecs.hardware.memorieRAM) || '';

      const is2GB =
        /\b2\s*GB\b/i.test(name) ||
        /\b2\s*GB\b/i.test(ram) ||
        /\b2\s*GB\b/i.test(memorieRAM);

      if (!is2GB) {
        continue; // not a 2GB product, skip
      }

      if (imageCount <= 20) {
        skipped.push({ name: product.name, imageCount, reason: `only ${imageCount} images (need > 20)` });
        continue;
      }

      // Qualifies — update price
      await Product.updateOne(
        { _id: product._id },
        { $set: { price: TARGET_PRICE } }
      );

      updated.push({ name: product.name, oldPrice: product.price, imageCount });
      console.log(`Updated: "${product.name}" | was ${product.price} RON | images: ${imageCount}`);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Products updated to ${TARGET_PRICE} RON: ${updated.length}`);
    if (updated.length > 0) {
      updated.forEach(p => console.log(`  ✓ ${p.name} (was ${p.oldPrice} RON, ${p.imageCount} images)`));
    }

    if (skipped.length > 0) {
      console.log(`\n2GB products skipped (not enough images): ${skipped.length}`);
      skipped.forEach(p => console.log(`  - ${p.name} — ${p.reason}`));
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error updating prices:', error);
    process.exit(1);
  }
}

updateVW2GBPrice();
