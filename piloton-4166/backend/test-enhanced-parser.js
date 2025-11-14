const FeedParser = require('./services/feedParser');
const fs = require('fs');
const path = require('path');

async function testEnhancedParser() {
  try {
    console.log('Testing Enhanced Feed Parser...\n');

    const parser = new FeedParser();

    // Read sample XML data from the file
    const xmlFilePath = path.join(__dirname, '../navishop/public/0dd00d87fcaef80b64aa73135f2c480c.xml');

    if (!fs.existsSync(xmlFilePath)) {
      console.error('XML file not found at:', xmlFilePath);
      return;
    }

    console.log('Reading XML file...');
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

    console.log('Parsing XML data...');
    const feedData = await parser.parseFeed(xmlData);

    console.log('Processing products...');
    const products = parser.processProducts(feedData);

    console.log(`\nFound ${products.length} products. Testing first 3 products:\n`);

    // Test first 3 products
    for (let i = 0; i < Math.min(3, products.length); i++) {
      const product = products[i];

      console.log(`=== PRODUCT ${i + 1}: ${product.name} ===`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Brand: ${product.brand}`);
      console.log(`Category: ${product.category}`);
      console.log(`Price: ${product.price} RON`);

      console.log('\n--- Detailed Specs ---');
      if (product.detailedSpecs) {
        Object.entries(product.detailedSpecs).forEach(([key, value]) => {
          if (value) console.log(`${key}: ${value}`);
        });
      }

      console.log('\n--- Display Specs ---');
      if (product.displaySpecs) {
        Object.entries(product.displaySpecs).forEach(([key, value]) => {
          if (value) console.log(`${key}: ${value}`);
        });
      }

      console.log('\n--- Technical Features ---');
      if (product.technicalFeatures && product.technicalFeatures.length > 0) {
        product.technicalFeatures.forEach(feature => {
          console.log(`• ${feature}`);
        });
      } else {
        console.log('No technical features extracted');
      }

      console.log('\n--- Connectivity Options ---');
      if (product.connectivityOptions && product.connectivityOptions.length > 0) {
        product.connectivityOptions.forEach(option => {
          console.log(`• ${option}`);
        });
      } else {
        console.log('No connectivity options extracted');
      }

      console.log('\n--- Compatibility ---');
      if (product.compatibility && product.compatibility.length > 0) {
        product.compatibility.forEach(compat => {
          console.log(`• ${compat.brand} ${compat.model} (${compat.yearFrom}-${compat.yearTo})`);
        });
      } else {
        console.log('No compatibility info extracted');
      }

      console.log('\n--- Images ---');
      console.log(`Found ${product.images.length} images`);
      product.images.forEach((img, idx) => {
        console.log(`${idx + 1}. ${img.isPrimary ? '[PRIMARY]' : '[ADDITIONAL]'} ${img.url.substring(0, 80)}...`);
      });

      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Summary statistics
    console.log('\n=== EXTRACTION STATISTICS ===');
    const stats = {
      totalProducts: products.length,
      withDetailedSpecs: products.filter(p => Object.keys(p.detailedSpecs || {}).length > 0).length,
      withDisplaySpecs: products.filter(p => Object.keys(p.displaySpecs || {}).length > 0).length,
      withTechnicalFeatures: products.filter(p => p.technicalFeatures && p.technicalFeatures.length > 0).length,
      withConnectivity: products.filter(p => p.connectivityOptions && p.connectivityOptions.length > 0).length,
      withCompatibility: products.filter(p => p.compatibility && p.compatibility.length > 0).length
    };

    Object.entries(stats).forEach(([key, value]) => {
      const percentage = key !== 'totalProducts' ? ` (${((value / stats.totalProducts) * 100).toFixed(1)}%)` : '';
      console.log(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}${percentage}`);
    });

  } catch (error) {
    console.error('Error testing enhanced parser:', error);
  }
}

// Run the test
testEnhancedParser();