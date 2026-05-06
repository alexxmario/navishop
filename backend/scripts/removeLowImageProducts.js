const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

const TARGETS = [
  // VW
  { brand: 'Volkswagen', model: 'Amarok', regex: /amarok/i },
  { brand: 'Volkswagen', model: 'Caddy 3', regex: /caddy/i },
  { brand: 'Volkswagen', model: 'Eos', regex: /eos/i },
  { brand: 'Volkswagen', model: 'Passat CC', regex: /passat\s*cc/i },
  { brand: 'Volkswagen', model: 'Scirocco', regex: /scirocco/i },
  { brand: 'Volkswagen', model: 'Tiguan', regex: /tiguan/i },
  // Seat
  { brand: 'Seat', model: 'Alhambra', regex: /alhambra/i },
  // Skoda
  { brand: 'Skoda', model: 'Octavia', regex: /octavia/i },
  { brand: 'Skoda', model: 'Roomster', regex: /roomster/i },
];

async function removeLowImageProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    let totalRemoved = 0;

    for (const target of TARGETS) {
      const products = await Product.find({
        $or: [
          { model: target.regex },
          { name: target.regex }
        ]
      }).lean();

      const lowImage = products.filter(p => !p.images || p.images.length < 20);

      if (lowImage.length === 0) {
        console.log(`${target.brand} ${target.model}: no products with <20 images`);
        continue;
      }

      console.log(`\n${target.brand} ${target.model}: ${lowImage.length} products with <20 images (out of ${products.length} total)`);
      for (const p of lowImage) {
        console.log(`  [DELETE] ${p.name} (${p.images?.length || 0} images) [${p.sku}]`);
      }

      const ids = lowImage.map(p => p._id);
      const result = await Product.deleteMany({ _id: { $in: ids } });
      console.log(`  -> Deleted ${result.deletedCount} products`);
      totalRemoved += result.deletedCount;
    }

    console.log(`\n========================================`);
    console.log(`Total products removed: ${totalRemoved}`);
    console.log(`========================================`);

    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

removeLowImageProducts();
