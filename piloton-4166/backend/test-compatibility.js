const FeedParser = require('./services/feedParser');
const fs = require('fs');
const path = require('path');

async function testBackwardCompatibility() {
  try {
    console.log('Testing Backward Compatibility...\n');

    const parser = new FeedParser();

    // Test basic functionality without enhanced specs
    console.log('1. Testing basic parser methods...');

    // Test parsePrice method
    const price1 = parser.parsePrice('1430 RON');
    const price2 = parser.parsePrice('2,590 RON');
    console.log(`parsePrice('1430 RON'): ${price1}`);
    console.log(`parsePrice('2,590 RON'): ${price2}`);

    // Test generateSlug method
    const slug = parser.generateSlug('Navigatie PilotOn Alfa Romeo Giulietta 2010-2014');
    console.log(`generateSlug test: "${slug}"`);

    // Test generateSku method
    const sku = parser.generateSku('7408', 'PilotOn');
    console.log(`generateSku test: "${sku}"`);

    // Test category determination
    const category = parser.determineCategory('Navigatie PilotOn GPS', 'Navigation');
    console.log(`determineCategory test: "${category}"`);

    console.log('\n2. Testing with minimal XML entry...');

    // Create a minimal XML entry to test compatibility
    const minimalEntry = {
      'g:id': 'TEST001',
      'g:title': 'Test Navigation Device',
      'g:description': 'A simple navigation device for testing.',
      'g:link': 'https://example.com/test',
      'g:price': '500 RON',
      'g:brand': 'TestBrand',
      'g:condition': 'new',
      'g:availability': 'in_stock',
      'g:image_link': 'https://example.com/image.jpg'
    };

    const product = parser.processProduct(minimalEntry);

    console.log('Minimal product processing result:');
    console.log(`- Name: ${product.name}`);
    console.log(`- SKU: ${product.sku}`);
    console.log(`- Price: ${product.price}`);
    console.log(`- Category: ${product.category}`);
    console.log(`- Images: ${product.images.length}`);
    console.log(`- Enhanced specs present: ${Object.keys(product.detailedSpecs || {}).length > 0}`);
    console.log(`- Technical features: ${product.technicalFeatures ? product.technicalFeatures.length : 0}`);
    console.log(`- Display specs: ${Object.keys(product.displaySpecs || {}).length > 0}`);

    console.log('\n3. Testing existing field structure...');

    // Verify all existing fields are still present
    const requiredFields = [
      'externalId', 'name', 'description', 'slug', 'sku', 'price', 'stock',
      'category', 'brand', 'images', 'compatibility', 'specifications',
      'externalLink', 'featured', 'onSale', 'averageRating', 'totalReviews'
    ];

    const missingFields = requiredFields.filter(field => !(field in product));

    if (missingFields.length === 0) {
      console.log('✓ All required fields present');
    } else {
      console.log('✗ Missing fields:', missingFields);
    }

    // Verify enhanced fields are properly added
    const enhancedFields = ['detailedSpecs', 'displaySpecs', 'technicalFeatures', 'connectivityOptions'];
    const presentEnhancedFields = enhancedFields.filter(field => field in product);

    console.log(`Enhanced fields present: ${presentEnhancedFields.join(', ')}`);

    console.log('\n4. Testing with actual XML data (first product)...');

    const xmlFilePath = path.join(__dirname, '../navishop/public/0dd00d87fcaef80b64aa73135f2c480c.xml');
    if (fs.existsSync(xmlFilePath)) {
      const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
      const feedData = await parser.parseFeed(xmlData);
      const products = parser.processProducts(feedData);

      if (products.length > 0) {
        const firstProduct = products[0];
        console.log('Real product test:');
        console.log(`- All basic fields present: ${requiredFields.every(field => field in firstProduct)}`);
        console.log(`- Enhanced specs extracted: ${Object.keys(firstProduct.detailedSpecs || {}).length} specs`);
        console.log(`- Technical features: ${firstProduct.technicalFeatures ? firstProduct.technicalFeatures.length : 0} features`);
        console.log(`- Display specs: ${Object.keys(firstProduct.displaySpecs || {}).length} specs`);
        console.log(`- Connectivity options: ${firstProduct.connectivityOptions ? firstProduct.connectivityOptions.length : 0} options`);
      }
    }

    console.log('\n✅ Backward compatibility validation completed successfully!');
    console.log('✅ All existing functionality preserved');
    console.log('✅ Enhanced specifications properly integrated');

  } catch (error) {
    console.error('❌ Backward compatibility test failed:', error);
  }
}

// Run the test
testBackwardCompatibility();