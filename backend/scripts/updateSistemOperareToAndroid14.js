require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function updateSistemOperareToAndroid14() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Update all products that have sistemOperare set to "Android"
    console.log('Updating all products with "Android" to "Android 14"...');

    const result = await Product.updateMany(
      {
        $or: [
          { "romanianSpecs.general.sistemOperare": "Android" },
          { "romanianSpecs.rawDetails.Sistem de Operare": "Android" }
        ]
      },
      {
        $set: {
          "romanianSpecs.general.sistemOperare": "Android 14",
          "romanianSpecs.rawDetails.Sistem de Operare": "Android 14"
        }
      }
    );

    console.log('\n=== SISTEM DE OPERARE UPDATE RESULTS ===');
    console.log(`Products matched: ${result.matchedCount}`);
    console.log(`Products modified: ${result.modifiedCount}`);
    console.log('=========================================\n');

    // Verify the update
    const verifyCount = await Product.countDocuments({
      "romanianSpecs.general.sistemOperare": "Android 14"
    });
    console.log(`Verification: ${verifyCount} products now have "Android 14" as Sistem de Operare`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateSistemOperareToAndroid14();
