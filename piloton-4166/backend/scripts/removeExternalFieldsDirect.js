require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for external fields removal (direct)');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const removeExternalFieldsDirect = async () => {
  try {
    console.log('Starting direct removal of external fields...');
    
    // Get direct access to products collection
    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    
    // Count products with external fields
    const productsWithExternalId = await productsCollection.countDocuments({ externalId: { $exists: true } });
    const productsWithExternalLink = await productsCollection.countDocuments({ externalLink: { $exists: true } });
    
    console.log(`Products with externalId: ${productsWithExternalId}`);
    console.log(`Products with externalLink: ${productsWithExternalLink}`);
    
    if (productsWithExternalId === 0 && productsWithExternalLink === 0) {
      console.log('✅ No external fields found - already clean!');
      return;
    }
    
    // Remove externalId field from all products
    const externalIdResult = await productsCollection.updateMany(
      {},
      { $unset: { externalId: "", externalLink: "" } }
    );
    
    console.log(`✓ Updated ${externalIdResult.modifiedCount} products`);
    
    // Verify removal
    const remainingExternalIds = await productsCollection.countDocuments({ externalId: { $exists: true } });
    const remainingExternalLinks = await productsCollection.countDocuments({ externalLink: { $exists: true } });
    
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
  await removeExternalFieldsDirect();
  mongoose.connection.close();
  console.log('Direct external fields removal completed and database connection closed.');
};

if (require.main === module) {
  runRemoval();
}

module.exports = { removeExternalFieldsDirect };