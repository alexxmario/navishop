require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const FeedParser = require('../services/feedParser');

async function fixVWAmarok() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    console.log('Fetching feed data...');
    const feedParser = new FeedParser();
    const feedData = await feedParser.fetchFeed();
    const parsedFeed = await feedParser.parseFeed(feedData);
    const products = feedParser.processProducts(parsedFeed);

    console.log(`Found ${products.length} products in feed`);

    // Find VW Amarok specifically
    const vwAmarokFeed = products.find(p =>
      p.name === 'Navigatie PilotOn VW Amarok 2016-2022 2K 8GB 256GB 8 CORE'
    );

    if (vwAmarokFeed) {
      console.log('Found VW Amarok in feed:');
      console.log('  Name:', vwAmarokFeed.name);
      console.log('  External ID:', vwAmarokFeed.externalId);
      console.log('  Description length:', vwAmarokFeed.description.length);
      console.log('  First 100 chars:', vwAmarokFeed.description.substring(0, 100));

      // Find it in database
      const dbProduct = await Product.findOne({
        slug: 'navigatie-piloton-vw-amarok-2016-2022-2k-8gb-256gb-8-core'
      });

      if (dbProduct) {
        console.log('\nFound in database:');
        console.log('  Name:', dbProduct.name);
        console.log('  External ID:', dbProduct.externalId);
        console.log('  Current description length:', dbProduct.description.length);

        // Update the description
        await Product.findByIdAndUpdate(dbProduct._id, {
          $set: {
            description: vwAmarokFeed.description,
            structuredDescription: undefined // Clear so it gets regenerated
          }
        });

        console.log('\n✓ Updated VW Amarok with new description');
        console.log('  New description length:', vwAmarokFeed.description.length);
      } else {
        console.log('VW Amarok NOT found in database');
      }
    } else {
      console.log('VW Amarok NOT found in feed');
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixVWAmarok();