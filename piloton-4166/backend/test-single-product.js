const FeedParser = require('./services/feedParser');

async function testSingleProduct() {
  try {
    console.log('Testing single product specification extraction...');

    const feedParser = new FeedParser();

    // Test with the Opel Antara product URL directly
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-opel-antara-2006-2017-2k-4gb-64gb-8-core-8671';

    console.log('Extracting specifications from:', testUrl);
    const romanianSpecs = await feedParser.extractRealSpecifications(testUrl);

    console.log('\nExtracted Romanian Specifications:');
    console.log(JSON.stringify(romanianSpecs, null, 2));

    // Check specific fields we care about
    console.log('\n--- Key Fields Check ---');
    console.log('SKU:', romanianSpecs?.general?.sku || 'Not found');
    console.log('Diagonala Display:', romanianSpecs?.display?.diagonalaDisplay || 'Not found');
    console.log('Conectivitate:', romanianSpecs?.connectivity?.conectivitate || 'Not found');
    console.log('Model Procesor:', romanianSpecs?.hardware?.modelProcesor || 'Not found');
    console.log('Memorie RAM:', romanianSpecs?.hardware?.memorieRAM || 'Not found');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSingleProduct();