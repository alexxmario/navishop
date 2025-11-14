const axios = require('axios');
const cheerio = require('cheerio');

async function testConnectivityFix() {
  try {
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-9-inch-2gb-32gb-4-core-7450';

    console.log('Testing connectivity extraction fix...');

    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const productDetails = $('.product-details');
    const detailsText = productDetails.text();

    console.log('\n=== LOOKING FOR CONECTIVITATE ===');

    // Look for "Conectivitate" specifically
    const conectivityMatch = detailsText.match(/Conectivitate\s*([^]*?)(?=Destinat|Marca|Tip Montare|Preluare|$)/i);
    if (conectivityMatch) {
      console.log('Found Conectivitate:', conectivityMatch[1].trim().replace(/\s+/g, ' '));
    } else {
      console.log('❌ Conectivitate not found with this pattern');
    }

    // Look for "Bluetooth" specifically
    const bluetoothMatch = detailsText.match(/Bluetooth\s*([^]*?)(?=Continut|Limitari|$)/i);
    if (bluetoothMatch) {
      console.log('Found Bluetooth:', bluetoothMatch[1].trim().replace(/\s+/g, ' '));
    } else {
      console.log('❌ Bluetooth not found with this pattern');
    }

    // Let's see what's around "Conectivitate" in the raw text
    console.log('\n=== RAW TEXT AROUND CONECTIVITATE ===');
    const lines = detailsText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('conectivitate')) {
        console.log(`Line ${i}: ${lines[i].trim()}`);
        console.log(`Line ${i+1}: ${lines[i+1] ? lines[i+1].trim() : 'N/A'}`);
        console.log(`Line ${i+2}: ${lines[i+2] ? lines[i+2].trim() : 'N/A'}`);
        console.log(`Line ${i+3}: ${lines[i+3] ? lines[i+3].trim() : 'N/A'}`);
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConnectivityFix();