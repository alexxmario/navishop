const axios = require('axios');
const cheerio = require('cheerio');

async function checkBMWLink() {
  try {
    const bmwUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-2k-4gb-64gb-8-core-7439';

    console.log('Checking BMW link:', bmwUrl);

    const response = await axios.get(bmwUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      maxRedirects: 5
    });

    console.log('Final URL after redirects:', response.request.res.responseUrl || response.config.url);
    console.log('Status:', response.status);

    // Check the page title to see what product we actually got
    const $ = cheerio.load(response.data);
    const title = $('title').text() || $('h1').first().text();

    console.log('Page title:', title);

    // Check if it mentions BMW or Audi
    if (title.toLowerCase().includes('bmw')) {
      console.log('✅ This is a BMW product page');
    } else if (title.toLowerCase().includes('audi')) {
      console.log('❌ This redirected to an Audi product page!');
    } else {
      console.log('? Unknown product type');
    }

    // Let's also check the product name on the page
    const productName = $('.product-title, .product-name, h1').first().text();
    console.log('Product name on page:', productName);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', error.response.headers);
    }
    process.exit(1);
  }
}

checkBMWLink();