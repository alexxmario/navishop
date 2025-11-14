require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for image URL migration');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const getFilenameFromUrl = (url) => {
  // Extract filename from URL like: https://cdnmpro.com/815608441/p/raw/1/navigatie-piloton-vw-touran-iii-dupa-2015-2k-8gb-256gb-8-core~85771.jpg
  const parts = url.split('/');
  return parts[parts.length - 1]; // Get the last part (filename)
};

const convertToLocalUrl = (remoteUrl) => {
  const filename = getFilenameFromUrl(remoteUrl);
  return `/images/products/${filename}`;
};

const migrateImageUrls = async () => {
  try {
    console.log('Starting image URL migration...');
    
    // Find all products with images
    const products = await Product.find({
      images: { $exists: true, $ne: [] }
    });
    
    console.log(`Found ${products.length} products with images`);
    
    let updatedProducts = 0;
    let totalUpdatedImages = 0;
    
    for (const product of products) {
      let hasChanges = false;
      const newImages = [];
      
      for (const image of product.images) {
        if (image.url.startsWith('https://cdnmpro.com/')) {
          // Convert remote URL to local URL
          const localUrl = convertToLocalUrl(image.url);
          newImages.push({
            ...image.toObject(),
            url: localUrl
          });
          hasChanges = true;
          totalUpdatedImages++;
        } else {
          // Keep existing URL if it's already local
          newImages.push(image);
        }
      }
      
      if (hasChanges) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { images: newImages } }
        );
        updatedProducts++;
        
        console.log(`✓ Updated: ${product.name} (${product.images.length} images)`);
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Products updated: ${updatedProducts}`);
    console.log(`Total images converted: ${totalUpdatedImages}`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error migrating image URLs:', error);
  }
};

const runMigration = async () => {
  await connectDB();
  await migrateImageUrls();
  mongoose.connection.close();
  console.log('Migration completed and database connection closed.');
};

if (require.main === module) {
  runMigration();
}

module.exports = { migrateImageUrls };