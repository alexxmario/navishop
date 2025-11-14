const axios = require('axios');
const cheerio = require('cheerio');

async function findUserText() {
  try {
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-2k-4gb-64gb-8-core-7439';

    console.log('Looking for the specific text the user mentioned...');

    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const fullPageText = $('body').text();

    const userText = 'Nu se poate monta pe masini care au navigatie originala din fabrica';

    if (fullPageText.includes(userText)) {
      console.log('✅ Found the user text in the page!');

      // Find context around it
      const lines = fullPageText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(userText)) {
          console.log('\nFound at line', i);
          console.log('Previous line:', lines[i-1]?.trim() || 'N/A');
          console.log('MATCH:', lines[i].trim());
          console.log('Next line:', lines[i+1]?.trim() || 'N/A');
          console.log('Next line 2:', lines[i+2]?.trim() || 'N/A');
          break;
        }
      }
    } else {
      console.log('❌ User text not found in the page');

      // Let me search for parts of it
      if (fullPageText.includes('navigatie originala')) {
        console.log('✅ Found "navigatie originala" in the page');
      }
      if (fullPageText.includes('incalzire in scaune')) {
        console.log('✅ Found "incalzire in scaune" in the page');
      }

      // Search for any occurrence of "monta" to see similar patterns
      const lines = fullPageText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('monta') || lines[i].toLowerCase().includes('fabrica')) {
          console.log(`\nFound similar text at line ${i}:`);
          console.log('LINE:', lines[i].trim());
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findUserText();