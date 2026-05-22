const mongoose = require('mongoose');
const Product = require('../models/Product');

require('dotenv').config();

async function updateNonVW2GB7InchPrice() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Exclude VW/Volkswagen, Seat and Skoda
    const products = await Product.find({
      brand: { $not: /^(VW|Volkswagen|Seat|Skoda)$/i },
      name:  { $not: /VW|Volkswagen|Seat|Skoda/i }
    });

    console.log(`Found ${products.length} non-VW/Seat/Skoda products total`);

    const updated = [];
    const skipped = [];

    for (const product of products) {
      const name       = product.name || '';
      const imageCount = product.images ? product.images.length : 0;

      const is2GB   = /\b4\s*GB\b/i.test(name);
      const is7inch = /\b7[\s-]*inch\b/i.test(name);

      if (!is2GB || !is7inch) continue;

      if (imageCount <= 18) {
        skipped.push({ name: product.name, imageCount });
        continue;
      }

      await Product.updateOne({ _id: product._id }, { $set: { price: 1049 } });
      updated.push({ name: product.name, oldPrice: product.price, imageCount });
      console.log(`[1049 RON] "${product.name}" | was ${product.price} RON | images: ${imageCount}`);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Products updated to 849 RON: ${updated.length}`);
    updated.forEach(p => console.log(`  ✓ ${p.name} (was ${p.oldPrice} RON, ${p.imageCount} images)`));

    if (skipped.length > 0) {
      console.log(`\nSkipped (not enough images): ${skipped.length}`);
      skipped.forEach(p => console.log(`  - ${p.name} — only ${p.imageCount} images (need > 18)`));
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error updating prices:', error);
    process.exit(1);
  }
}

updateNonVW2GB7InchPrice();
