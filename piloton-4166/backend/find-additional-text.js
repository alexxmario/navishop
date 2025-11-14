const axios = require('axios');
const cheerio = require('cheerio');

async function findAdditionalText() {
  try {
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-alfa-romeo-giulietta-2014-2020-2k-8gb-256gb-8-core-7419';

    console.log('Looking for "Toate navigatiile tip TABLETA" text...');

    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Search for the text in the entire page
    const fullPageText = $('body').text();

    if (fullPageText.includes('Toate navigatiile tip TABLETA')) {
      console.log('✅ Found "Toate navigatiile" text in the page!');

      // Find where it appears
      const lines = fullPageText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Toate navigatiile tip TABLETA')) {
          console.log(`\nFound at line ${i}:`);
          console.log('Previous line:', lines[i-1]?.trim() || 'N/A');
          console.log('MATCH:', lines[i].trim());
          console.log('Next line:', lines[i+1]?.trim() || 'N/A');
          console.log('Next line 2:', lines[i+2]?.trim() || 'N/A');
          break;
        }
      }

      // Look for it in different sections
      console.log('\n=== SEARCHING IN DIFFERENT SECTIONS ===');

      // Check if it's in product-details
      const productDetails = $('.product-details').text();
      if (productDetails.includes('Toate navigatiile tip TABLETA')) {
        console.log('Found in .product-details section');
      } else {
        console.log('NOT in .product-details section');
      }

      // Check other potential containers
      $('.specs, .specifications, .details, .info, .content, .description').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Toate navigatiile tip TABLETA')) {
          console.log(`Found in element: ${el.tagName}.${$(el).attr('class')}`);
        }
      });

      // Try to find the exact position
      const allDivs = $('div');
      allDivs.each((i, div) => {
        const text = $(div).text();
        if (text.includes('Toate navigatiile tip TABLETA') && text.length < 200) {
          console.log(`\nFound in div #${i}:`);
          console.log('Class:', $(div).attr('class'));
          console.log('ID:', $(div).attr('id'));
          console.log('Text:', text);
        }
      });

    } else {
      console.log('❌ "Toate navigatiile" text NOT found in the page');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findAdditionalText();