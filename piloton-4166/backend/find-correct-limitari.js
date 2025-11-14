const axios = require('axios');
const cheerio = require('cheerio');

async function findCorrectLimitariText() {
  try {
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-2k-4gb-64gb-8-core-7439';

    console.log('Searching for the exact Limitări text the user mentioned...');

    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const fullPageText = $('body').text();

    // Search for the user's exact text
    const userText = 'Nu se poate monta pe masini care au navigatie originala din fabrica';

    if (fullPageText.includes(userText)) {
      console.log('✅ Found the user text!');

      // Find the full text around it
      const lines = fullPageText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(userText)) {
          console.log('\nFound at line', i);
          console.log('Previous line:', lines[i-1]?.trim() || 'N/A');
          console.log('LIMITĂRI LINE:', lines[i].trim());
          console.log('Next line:', lines[i+1]?.trim() || 'N/A');
          console.log('Next line 2:', lines[i+2]?.trim() || 'N/A');

          // Try to get the full Limitări text by combining lines
          let fullLimitariText = lines[i].trim();
          if (lines[i+1] && lines[i+1].includes('Daca masina are incalzire')) {
            fullLimitariText += ' ' + lines[i+1].trim();
          }

          console.log('\n🎯 FULL LIMITĂRI TEXT:');
          console.log('"' + fullLimitariText + '"');
          break;
        }
      }
    } else {
      console.log('❌ User text not found. Let me search more thoroughly...');

      // Search in different sections
      console.log('\n=== SEARCHING IN PRODUCT DETAILS SECTION ===');
      const productDetails = $('.product-details').text();
      if (productDetails.includes('navigatie originala')) {
        console.log('✅ Found "navigatie originala" in product-details');
      }

      console.log('\n=== SEARCHING IN ALL DIV ELEMENTS ===');
      $('div').each((i, div) => {
        const text = $(div).text();
        if (text.includes('navigatie originala din fabrica') || text.includes('incalzire in scaune')) {
          console.log(`Found in div #${i}:`);
          console.log('Class:', $(div).attr('class'));
          console.log('ID:', $(div).attr('id'));
          console.log('Text snippet:', text.substring(0, 200) + '...');
        }
      });

      // Also search for the complete text with variations
      const variations = [
        'Nu se poate monta pe masini care au navigatie originala din fabrica',
        'navigatie originala din fabrica',
        'incalzire in scaune',
        'butoanele se vor reloca'
      ];

      for (let variation of variations) {
        if (fullPageText.includes(variation)) {
          console.log(`\n✅ Found variation: "${variation}"`);

          const lines = fullPageText.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(variation)) {
              console.log('Context:');
              console.log('Line', i-1, ':', lines[i-1]?.trim() || 'N/A');
              console.log('Line', i, ':', lines[i].trim());
              console.log('Line', i+1, ':', lines[i+1]?.trim() || 'N/A');
              console.log('Line', i+2, ':', lines[i+2]?.trim() || 'N/A');
              break;
            }
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findCorrectLimitariText();