const mongoose = require('mongoose');
const Product = require('../models/Product');
const BrandModelExtractor = require('../services/brandModelExtractor');

require('dotenv').config();

async function fixVWBrands() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    const extractor = new BrandModelExtractor();
    
    // Find all products with VW in the name
    const vwProducts = await Product.find({
      name: { $regex: /VW/i }
    });

    console.log(`Found ${vwProducts.length} VW products to update`);

    let updated = 0;
    for (const product of vwProducts) {
      const extracted = extractor.extractBrandModelFromName(product.name);
      
      if (extracted && extracted.brand === 'Volkswagen') {
        // Update the product's brand field if it exists
        if (product.brand !== 'Volkswagen') {
          await Product.updateOne(
            { _id: product._id },
            { 
              $set: { 
                brand: 'Volkswagen',
                model: extracted.model,
                generation: extracted.generation
              }
            }
          );
          updated++;
          console.log(`Updated product: ${product.name}`);
        }
      }
    }

    console.log(`Successfully updated ${updated} products`);
    
    // Test the brand extraction
    console.log('\n--- Testing brand extraction ---');
    const testProducts = await Product.find({
      name: { $regex: /VW|Volkswagen/i }
    }).limit(5);
    
    for (const product of testProducts) {
      const extracted = extractor.extractBrandModelFromName(product.name);
      console.log(`${product.name} -> Brand: ${extracted?.brand}, Model: ${extracted?.model}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing VW brands:', error);
    process.exit(1);
  }
}

fixVWBrands();