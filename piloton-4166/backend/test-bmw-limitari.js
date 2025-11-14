const axios = require('axios');
const cheerio = require('cheerio');

async function testBMWLimitari() {
  try {
    // Test the specific BMW product with Limitări
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-2k-4gb-64gb-8-core-7439';

    console.log('Testing BMW Seria 1 2K 4GB 64GB 8 CORE...');
    console.log('URL:', testUrl);

    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const productDetails = $('.product-details');
    const metaFields = $('.product-meta-fields');
    const fullText = productDetails.text() + '\n' + metaFields.text();

    console.log('\n=== SEARCHING FOR LIMITĂRI ===');
    if (fullText.toLowerCase().includes('limitari') || fullText.toLowerCase().includes('limitări')) {
      console.log('✅ Found Limitări text!');

      // Find the specific text around Limitări
      const lines = fullText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('limitari') || lines[i].toLowerCase().includes('limitări')) {
          console.log(`\nFound at line ${i}:`);
          console.log('Previous line:', lines[i-1]?.trim() || 'N/A');
          console.log('LIMITĂRI LINE:', lines[i].trim());
          console.log('Next line:', lines[i+1]?.trim() || 'N/A');
          console.log('Next line 2:', lines[i+2]?.trim() || 'N/A');
          console.log('Next line 3:', lines[i+3]?.trim() || 'N/A');
          console.log('Next line 4:', lines[i+4]?.trim() || 'N/A');
          break;
        }
      }
    } else {
      console.log('❌ No Limitări text found');
    }

    // Let's also check for the specific text you mentioned
    const targetText = 'Nu se poate monta pe masini care au navigatie originala din fabrica';
    if (fullText.includes(targetText)) {
      console.log('\n✅ Found the specific Limitări text you mentioned!');
      console.log('Target text found:', targetText);
    } else {
      console.log('\n❌ Specific Limitări text not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testBMWLimitari();