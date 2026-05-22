const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config();

async function updateVWGroupPrices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Find all VW/Volkswagen/Seat/Skoda products
    const vwProducts = await Product.find({
      $or: [
        { brand: { $regex: /^VW$/i } },
        { brand: { $regex: /^Volkswagen$/i } },
        { brand: { $regex: /^Seat$/i } },
        { brand: { $regex: /^Skoda$/i } },
        { name: { $regex: /VW|Volkswagen|Seat|Skoda/i } }
      ]
    });

    console.log(`Found ${vwProducts.length} VW/Volkswagen/Seat/Skoda products total`);

    const updated2GB = [];
    const updated4GB4Core = [];
    const updated8Core = [];
    const skipped = [];

    for (const product of vwProducts) {
      const imageCount = product.images ? product.images.length : 0;
      const name = product.name || '';
      const ram = (product.detailedSpecs && product.detailedSpecs.ram) || '';
      const memorieRAM = (product.romanianSpecs && product.romanianSpecs.hardware && product.romanianSpecs.hardware.memorieRAM) || '';

      const is2GB =
        /\b2\s*GB\b/i.test(name) ||
        /\b2\s*GB\b/i.test(ram) ||
        /\b2\s*GB\b/i.test(memorieRAM);

      const is4GB =
        /\b4\s*GB\b/i.test(name) ||
        /\b4\s*GB\b/i.test(ram) ||
        /\b4\s*GB\b/i.test(memorieRAM);

      const is4Core = /\b4\s*Core\b/i.test(name);
      const is8Core = /\b8\s*Core\b/i.test(name);

      const is6GB =
        /\b6\s*GB\b/i.test(name) ||
        /\b6\s*GB\b/i.test(ram) ||
        /\b6\s*GB\b/i.test(memorieRAM);

      const qualifies8Core = (is4GB || is6GB) && is8Core;

      if (!is2GB && !(is4GB && is4Core) && !qualifies8Core) {
        continue; // not a target product
      }

      if (imageCount <= 20) {
        skipped.push({ name: product.name, imageCount, reason: `only ${imageCount} images (need > 20)` });
        continue;
      }

      // 2GB always takes priority — checked first regardless of core count
      if (is2GB) {
        await Product.updateOne({ _id: product._id }, { $set: { price: 799 } });
        updated2GB.push({ name: product.name, oldPrice: product.price, imageCount });
        console.log(`[799 RON] "${product.name}" | was ${product.price} RON | images: ${imageCount}`);
      } else if (qualifies8Core) {
        await Product.updateOne({ _id: product._id }, { $set: { price: 1499 } });
        updated8Core.push({ name: product.name, oldPrice: product.price, imageCount });
        console.log(`[1499 RON] "${product.name}" | was ${product.price} RON | images: ${imageCount}`);
      } else if (is4GB && is4Core) {
        await Product.updateOne({ _id: product._id }, { $set: { price: 999 } });
        updated4GB4Core.push({ name: product.name, oldPrice: product.price, imageCount });
        console.log(`[999 RON] "${product.name}" | was ${product.price} RON | images: ${imageCount}`);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`2GB products updated to 799 RON: ${updated2GB.length}`);
    updated2GB.forEach(p => console.log(`  ✓ ${p.name} (was ${p.oldPrice} RON, ${p.imageCount} images)`));

    console.log(`\n4GB + 4 Core products updated to 999 RON: ${updated4GB4Core.length}`);
    updated4GB4Core.forEach(p => console.log(`  ✓ ${p.name} (was ${p.oldPrice} RON, ${p.imageCount} images)`));

    console.log(`\n(4GB or 6GB) + 8 Core products updated to 1499 RON: ${updated8Core.length}`);
    updated8Core.forEach(p => console.log(`  ✓ ${p.name} (was ${p.oldPrice} RON, ${p.imageCount} images)`));

    if (skipped.length > 0) {
      console.log(`\nSkipped (not enough images): ${skipped.length}`);
      skipped.forEach(p => console.log(`  - ${p.name} — ${p.reason}`));
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error updating prices:', error);
    process.exit(1);
  }
}

updateVWGroupPrices();
