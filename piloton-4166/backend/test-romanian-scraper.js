const RomanianSpecsScraper = require('./services/romanianSpecsScraper');

async function testScraper() {
  const scraper = new RomanianSpecsScraper();

  // Test with the BMW X3 product
  const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-x3-e83-2003-2011-2k-8gb-256gb-8-core-7494';

  console.log('Testing Romanian specs scraper...');
  console.log(`URL: ${testUrl}\n`);

  try {
    const result = await scraper.scrapeProductDetails(testUrl);

    if (result) {
      console.log('✅ Scraping successful!');
      console.log(`Raw details found: ${Object.keys(result.rawDetails).length}`);
      console.log('\n--- Raw Details ---');
      Object.entries(result.rawDetails).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });

      console.log('\n--- Structured Details ---');
      console.log('Hardware:', result.structuredDetails.hardware);
      console.log('Display:', result.structuredDetails.display);
      console.log('Connectivity:', result.structuredDetails.connectivity);
      console.log('Features:', result.structuredDetails.features);

    } else {
      console.log('❌ Scraping failed - no data returned');
    }

  } catch (error) {
    console.error('❌ Scraping failed with error:', error.message);
  }
}

testScraper();