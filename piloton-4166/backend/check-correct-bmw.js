const axios = require('axios');
const cheerio = require('cheerio');

async function checkCorrectBMW() {
  try {
    const correctBMWUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-2k-4gb-64gb-8-core-7463';

    console.log('Checking correct BMW link:', correctBMWUrl);

    const response = await axios.get(correctBMWUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log('Status:', response.status);

    const $ = cheerio.load(response.data);
    const title = $('title').text() || $('h1').first().text();
    console.log('Page title:', title);

    // Check if this is the correct BMW product
    if (title.toLowerCase().includes('bmw')) {
      console.log('✅ This is a BMW product page');
    } else {
      console.log('❌ This is not a BMW product page');
    }

    // Search for the user's Limitări text
    const productDetails = $('.product-details').text();
    const metaFields = $('.product-meta-fields').text();
    const fullText = productDetails + '\n' + metaFields;

    const userLimitariText = 'Nu se poate monta pe masini care au navigatie originala din fabrica';

    if (fullText.includes(userLimitariText)) {
      console.log('\n✅ Found the user\'s Limitări text!');

      // Find the complete Limitări text
      const lines = fullText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(userLimitariText)) {
          console.log('\nFound at line', i);
          console.log('Full text:', lines[i].trim());

          // Check if the next line has the second part
          if (lines[i+1] && lines[i+1].includes('Daca masina are incalzire')) {
            console.log('Second part:', lines[i+1].trim());

            const completeLimitariText = lines[i].trim() + ' ' + lines[i+1].trim();
            console.log('\n🎯 COMPLETE LIMITĂRI TEXT:');
            console.log('"' + completeLimitariText + '"');
          }
          break;
        }
      }
    } else {
      console.log('\n❌ User\'s Limitări text not found');

      // Search for any Limitări section
      if (fullText.includes('Limitari')) {
        console.log('✅ Found some Limitări text');

        const lines = fullText.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes('limitari')) {
            console.log('\nLimitări section found:');
            console.log('Previous line:', lines[i-1]?.trim() || 'N/A');
            console.log('Limitări line:', lines[i].trim());
            console.log('Next line:', lines[i+1]?.trim() || 'N/A');
            console.log('Next line 2:', lines[i+2]?.trim() || 'N/A');
            break;
          }
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCorrectBMW();