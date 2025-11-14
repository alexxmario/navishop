const axios = require('axios');
const cheerio = require('cheerio');

async function findLimitariText() {
  try {
    // Let's test a few different product URLs to find one with Limitări
    const testUrls = [
      'https://www.navi-abc.ro/cumpara/navigatie-piloton-opel-antara-2006-2017-2k-4gb-64gb-8-core-7346',
      'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-9-inch-2gb-32gb-4-core-7450',
      'https://www.navi-abc.ro/cumpara/navigatie-piloton-alfa-romeo-giulietta-2014-2020-2k-8gb-256gb-8-core-7419'
    ];

    for (let url of testUrls) {
      console.log(`\n=== TESTING: ${url} ===`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const productDetails = $('.product-details');
      const metaFields = $('.product-meta-fields');
      const fullText = productDetails.text() + '\n' + metaFields.text();

      console.log('Searching for Limitări...');
      if (fullText.toLowerCase().includes('limitari') || fullText.toLowerCase().includes('limitări')) {
        console.log('✅ Found Limitări text!');

        // Find the specific text around Limitări
        const lines = fullText.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes('limitari') || lines[i].toLowerCase().includes('limitări')) {
            console.log(`Found at line ${i}:`);
            console.log('Previous:', lines[i-1]?.trim() || 'N/A');
            console.log('MATCH:', lines[i].trim());
            console.log('Next:', lines[i+1]?.trim() || 'N/A');
            console.log('Next 2:', lines[i+2]?.trim() || 'N/A');
            break;
          }
        }
      } else {
        console.log('❌ No Limitări text found');
      }

      // Also search for other additional categories
      const additionalKeywords = ['observatii', 'observații', 'note', 'mentiuni', 'mențiuni', 'garantie', 'garanție'];
      additionalKeywords.forEach(keyword => {
        if (fullText.toLowerCase().includes(keyword)) {
          console.log(`✅ Found: ${keyword}`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findLimitariText();