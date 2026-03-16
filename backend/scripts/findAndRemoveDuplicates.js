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
      // Normalize the name for comparison
      let normalized = product.name
        .toLowerCase()
        // Remove hyphens from model names (CR-V -> CRV, HR-V -> HRV)
        .replace(/([a-z])-([a-z])/gi, '$1$2')
        // Roman numerals to Arabic (must be done in order: longest first)
        .replace(/\bxii\b/g, '12')   // XII -> 12
        .replace(/\bxi\b/g, '11')    // XI -> 11
        .replace(/\bix\b/g, '9')     // IX -> 9
        .replace(/\bx\b/g, '10')     // X -> 10 (must be after XI, XII, IX)
        .replace(/\bviii\b/g, '8')   // VIII -> 8
        .replace(/\bvii\b/g, '7')    // VII -> 7
        .replace(/\bvi\b/g, '6')     // VI -> 6
        .replace(/\biv\b/g, '4')     // IV -> 4
        .replace(/\bv\b/g, '5')      // V -> 5 (must be after IV, VII, VIII)
        .replace(/\biii\b/g, '3')    // III -> 3
        .replace(/\bii\b/g, '2')     // II -> 2
        .replace(/\bi\b/g, '1')      // I -> 1 (must be last)
        // Remove generation numbers at the end of model names before specs
        // "crv 1 2002-2006" and "crv 2002-2006" should match
        .replace(/(\b(?:crv|hrv|rav4|duster|sandero|logan|tiguan|golf|polo|clio|megane)\b)\s+\d+\s+(\d{4})/gi, '$1 $2')
        // Multiple spaces to single
        .replace(/\s+/g, ' ')
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
