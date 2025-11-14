require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const DescriptionParser = require('../services/descriptionParser');

async function debugVWAmarok() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');

    const vwProduct = await Product.findOne({
      slug: 'navigatie-piloton-vw-amarok-2016-2022-2k-8gb-256gb-8-core'
    });

    if (vwProduct) {
      console.log('VW Amarok found');
      console.log('Description length:', vwProduct.description.length);
      console.log('First 200 chars:', vwProduct.description.substring(0, 200));

      const parser = new DescriptionParser();
      const result = parser.parseDescription(vwProduct.description);

      console.log('\nParser results:');
      console.log('Sections found:', result.sections.length);

      if (result.sections.length > 0) {
        result.sections.forEach((section, i) => {
          console.log(`  ${i + 1}. ${section.title} (${section.points.length} points)`);
          if (section.points.length > 0) {
            console.log(`     First point: ${section.points[0]}`);
          }
        });

        // Update the product with structured description
        await Product.findByIdAndUpdate(vwProduct._id, {
          $set: {
            structuredDescription: {
              sections: result.sections,
              originalDescription: vwProduct.description,
              parsedAt: new Date()
            }
          }
        });
        console.log('\n✓ Updated VW Amarok with structured description');
      } else {
        console.log('No sections created - need to investigate why');
      }
    } else {
      console.log('VW Amarok not found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugVWAmarok();