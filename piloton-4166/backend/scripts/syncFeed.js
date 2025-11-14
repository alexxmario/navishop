require('dotenv').config();
const mongoose = require('mongoose');
const FeedParser = require('../services/feedParser');

async function syncProductFeed() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Run sync
    const feedParser = new FeedParser();
    const result = await feedParser.syncProducts();

    console.log('\n=== SYNC RESULTS ===');
    console.log(`Total products processed: ${result.total}`);
    console.log(`Successfully synced: ${result.synced}`);
    console.log(`Errors: ${result.errors}`);
    console.log('====================\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncProductFeed();