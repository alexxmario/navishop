require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
  console.log('Connected to MongoDB\n');

  // Search for any Seat products in the DB
  const seatProducts = await Product.find({
    $or: [
      { name: { $regex: /Seat/i } },
      { brand: { $regex: /Seat/i } },
      { sku: { $regex: /^SEAT/i } }
    ]
  }).select('name sku slug brand createdAt').lean();

  console.log(`Found ${seatProducts.length} Seat products in DB:\n`);
  for (const p of seatProducts) {
    console.log(`  Name: ${p.name}`);
    console.log(`  SKU:  ${p.sku}`);
    console.log(`  Brand: ${p.brand}`);
    console.log(`  Created: ${p.createdAt}`);
    console.log();
  }

  // Also check the specific SKUs from the conflicts
  const suspectSkus = ['TOLEDO040984', 'ALHAMBRA-LMQ8470GPS', 'ALTEA-LMQ8470GPS', 'ALTEAXL-LMQ8470GPS', 'TOLEDO-LMQ8470GPS'];
  const suspects = await Product.find({ sku: { $in: suspectSkus } }).select('name sku slug brand createdAt').lean();

  if (suspects.length > 0) {
    console.log(`\n--- Products with old-style SKUs ---\n`);
    for (const p of suspects) {
      console.log(`  Name: ${p.name}`);
      console.log(`  SKU:  ${p.sku}`);
      console.log(`  Brand: ${p.brand}`);
      console.log(`  Created: ${p.createdAt}`);
      console.log();
    }
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
