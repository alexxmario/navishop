require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function findAndRemoveDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    // Find all products
    const allProducts = await Product.find({ status: 'active' })
      .select('name slug sku price stock createdAt')
      .sort({ createdAt: 1 }); // Oldest first (keep older ones)

    console.log(`Total produse active: ${allProducts.length}\n`);

    // Group products by normalized name (replace "I" with "1", lowercase, remove extra spaces)
    const normalizedGroups = {};

    allProducts.forEach(product => {
      // Normalize the name: replace Roman numerals with Arabic, lowercase
      const normalized = product.name
        .toLowerCase()
        .replace(/\bi\b/g, '1')      // Tiguan I -> Tiguan 1
        .replace(/\bii\b/g, '2')     // Tiguan II -> Tiguan 2
        .replace(/\biii\b/g, '3')    // Tiguan III -> Tiguan 3
        .replace(/\biv\b/g, '4')     // Tiguan IV -> Tiguan 4
        .replace(/\s+/g, ' ')        // Multiple spaces to single
        .trim();

      if (!normalizedGroups[normalized]) {
        normalizedGroups[normalized] = [];
      }
      normalizedGroups[normalized].push(product);
    });

    // Find duplicates (groups with more than 1 product)
    const duplicates = Object.entries(normalizedGroups)
      .filter(([_, products]) => products.length > 1);

    if (duplicates.length === 0) {
      console.log('Nu s-au găsit produse duplicate!');
      await mongoose.connection.close();
      return;
    }

    console.log(`=== GĂSITE ${duplicates.length} GRUPURI DE DUPLICATE ===\n`);

    const toDelete = [];

    for (const [normalizedName, products] of duplicates) {
      console.log(`--- Grup: "${normalizedName}" (${products.length} produse) ---`);

      // Sort by createdAt - keep the oldest one
      products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const keeper = products[0];
      const duplicatesToRemove = products.slice(1);

      console.log(`  ✅ PĂSTRĂM: ${keeper.name}`);
      console.log(`     SKU: ${keeper.sku} | Creat: ${keeper.createdAt.toISOString().split('T')[0]}`);

      for (const dup of duplicatesToRemove) {
        console.log(`  ❌ ȘTERGEM: ${dup.name}`);
        console.log(`     SKU: ${dup.sku} | Creat: ${dup.createdAt.toISOString().split('T')[0]}`);
        toDelete.push(dup);
      }
      console.log('');
    }

    console.log(`\n=== REZUMAT ===`);
    console.log(`Total grupuri duplicate: ${duplicates.length}`);
    console.log(`Produse de șters: ${toDelete.length}`);
    console.log(`\nProduse care vor fi ȘTERSE:`);
    toDelete.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (SKU: ${p.sku})`);
    });

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nVrei să ștergi aceste produse? (da/nu): ', async (answer) => {
      if (answer.toLowerCase() === 'da') {
        console.log('\nȘtergere în curs...');

        for (const product of toDelete) {
          await Product.findByIdAndDelete(product._id);
          console.log(`  ✓ Șters: ${product.name}`);
        }

        console.log(`\n✅ Au fost șterse ${toDelete.length} produse duplicate!`);
      } else {
        console.log('\nOperație anulată. Nu s-a șters nimic.');
      }

      rl.close();
      await mongoose.connection.close();
      console.log('Done!');
    });

  } catch (error) {
    console.error('Eroare:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

findAndRemoveDuplicates();
