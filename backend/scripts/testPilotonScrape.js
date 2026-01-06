require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

// Test scraping one product to see what we get
async function testScrape() {
  // Try a known product URL - actual format from piloton.ro
  const testUrls = [
    'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-m14xl.html',
    'https://www.piloton.ro/gps-9-inch/sistem-de-navigatie-piloton-a9xl.html',
    'https://www.piloton.ro/gps-5-inch/sistem-de-navigatie-piloton-p5.html'
  ];

  for (const url of testUrls) {
    console.log('\n' + '='.repeat(80));
    console.log(`Testing: ${url}`);
    console.log('='.repeat(80));

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PilotOnBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8'
        }
      });

      const $ = cheerio.load(response.data);

      // Check for JSON-LD
      console.log('\n📋 JSON-LD Data:');
      const jsonLdScripts = $('script[type="application/ld+json"]');
      console.log(`Found ${jsonLdScripts.length} JSON-LD scripts`);

      jsonLdScripts.each((i, el) => {
        try {
          const data = JSON.parse($(el).html());
          console.log(`\nScript ${i + 1}:`, JSON.stringify(data, null, 2).substring(0, 500));
        } catch (e) {
          console.log(`Script ${i + 1}: Invalid JSON`);
        }
      });

      // Check for product name
      console.log('\n📦 Product Name:');
      console.log('h1:', $('h1').first().text().trim());
      console.log('.product-name:', $('.product-name').text().trim());
      console.log('[itemprop="name"]:', $('[itemprop="name"]').text().trim());

      // Check for description
      console.log('\n📝 Description:');
      const descSelectors = [
        '.product-description',
        '.description',
        '[itemprop="description"]',
        '.product-details',
        '#description',
        '.tab-content',
        '.product-info'
      ];

      for (const selector of descSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          const text = element.text().trim().substring(0, 200);
          console.log(`${selector}: "${text}..."`);
        }
      }

      // Check for specifications tables
      console.log('\n📊 Specifications:');
      const tableSelectors = [
        'table',
        '.specifications',
        '.specs-table',
        '.product-specs',
        '[class*="spec"]',
        '[class*="table"]'
      ];

      for (const selector of tableSelectors) {
        const tables = $(selector);
        if (tables.length > 0) {
          console.log(`\nFound ${tables.length} elements matching "${selector}"`);

          tables.slice(0, 2).each((i, table) => {
            console.log(`\n  Table ${i + 1}:`);
            $(table).find('tr').slice(0, 5).each((j, row) => {
              const cells = $(row).find('td, th');
              if (cells.length >= 2) {
                const key = $(cells[0]).text().trim();
                const value = $(cells[1]).text().trim();
                console.log(`    ${key}: ${value}`);
              }
            });
          });
        }
      }

      // Check for dl/dt/dd
      console.log('\n📋 Definition Lists (dl/dt/dd):');
      $('dl').each((i, dl) => {
        console.log(`\n  DL ${i + 1}:`);
        $(dl).find('dt').slice(0, 5).each((j, dt) => {
          const key = $(dt).text().trim();
          const dd = $(dt).next('dd');
          const value = dd.text().trim();
          console.log(`    ${key}: ${value}`);
        });
      });

      // Show all class names that might be relevant
      console.log('\n🏷️  Interesting classes found:');
      const allClasses = new Set();
      $('[class*="spec"], [class*="table"], [class*="desc"], [class*="product"], [class*="detail"]').each((i, el) => {
        const classes = $(el).attr('class');
        if (classes) {
          classes.split(' ').forEach(c => allClasses.add(c));
        }
      });
      console.log(Array.from(allClasses).sort().join(', '));

      // Show sample HTML structure
      console.log('\n🔍 Sample HTML (first 1000 chars of body):');
      console.log($('body').html().substring(0, 1000).replace(/\s+/g, ' '));

      break; // Only test first successful URL

    } catch (error) {
      console.log(`❌ Failed to fetch ${url}: ${error.message}`);
    }
  }
}

testScrape();
