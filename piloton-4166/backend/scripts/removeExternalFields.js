require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for external fields removal');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const removeExternalFields = async () => {
  try {
    console.log('Starting removal of external fields...');
    
    // Count products with external fields
    const productsWithExternalId = await Product.countDocuments({ externalId: { $exists: true } });
    const productsWithExternalLink = await Product.countDocuments({ externalLink: { $exists: true } });
    
    console.log(`Products with externalId: ${productsWithExternalId}`);
    console.log(`Products with externalLink: ${productsWithExternalLink}`);
    
    // Remove externalId field from all products
    const externalIdResult = await Product.updateMany(
      { externalId: { $exists: true } },
      { $unset: { externalId: "" } }
    );
    
    console.log(`✓ Removed externalId from ${externalIdResult.modifiedCount} products`);
    
    // Remove externalLink field from all products  
    const externalLinkResult = await Product.updateMany(
      { externalLink: { $exists: true } },
      { $unset: { externalLink: "" } }
    );
    
    console.log(`✓ Removed externalLink from ${externalLinkResult.modifiedCount} products`);
    
    // Verify removal
    const remainingExternalIds = await Product.countDocuments({ externalId: { $exists: true } });
    const remainingExternalLinks = await Product.countDocuments({ externalLink: { $exists: true } });
    
    console.log('\n=== Removal Summary ===');
    console.log(`Remaining products with externalId: ${remainingExternalIds}`);
    console.log(`Remaining products with externalLink: ${remainingExternalLinks}`);
    
    if (remainingExternalIds === 0 && remainingExternalLinks === 0) {
      console.log('✅ All external fields successfully removed!');
    } else {
      console.log('❌ Some external fields may still exist');
    }
    
  } catch (error) {
    console.error('Error removing external fields:', error);
  }
};

const runRemoval = async () => {
  await connectDB();
  await removeExternalFields();
  mongoose.connection.close();
  console.log('External fields removal completed and database connection closed.');
};

if (require.main === module) {
  runRemoval();
}

module.exports = { removeExternalFields };