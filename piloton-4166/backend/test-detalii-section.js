const axios = require('axios');
const cheerio = require('cheerio');

async function testDetaliiSection() {
  try {
    // Test the BMW product you mentioned
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-9-inch-2gb-32gb-4-core-7450';

    console.log('Testing Detalii section extraction from:', testUrl);
    console.log('================================================\n');

    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Look for the "Detalii" section
    console.log('=== SEARCHING FOR DETALII SECTION ===\n');

    // Method 1: Look for text "Detalii"
    const detaliiHeader = $('h2, h3, h4, .title').filter((i, el) => {
      return $(el).text().toLowerCase().includes('detalii');
    });

    if (detaliiHeader.length > 0) {
      console.log('Found Detalii header:', detaliiHeader.text());
      console.log('Next elements:');
      detaliiHeader.next().each((i, el) => {
        console.log('- Element type:', el.tagName);
        console.log('- Content:', $(el).text().substring(0, 200));
        console.log('---');
      });
    }

    // Method 2: Look for structured data in tables or lists
    console.log('\n=== LOOKING FOR STRUCTURED SPECIFICATION DATA ===\n');

    // Check for tables with specifications
    $('table').each((i, table) => {
      const tableText = $(table).text();
      if (tableText.includes('SKU') || tableText.includes('Brand') || tableText.includes('RAM')) {
        console.log(`Table ${i + 1} contains specifications:`);
        $(table).find('tr').each((j, row) => {
          const cells = $(row).find('td, th');
          if (cells.length >= 2) {
            const key = $(cells[0]).text().trim();
            const value = $(cells[1]).text().trim();
            if (key && value) {
              console.log(`  ${key}: ${value}`);
            }
          }
        });
        console.log('---');
      }
    });

    // Method 3: Look for definition lists or structured data
    $('dl').each((i, dl) => {
      console.log(`Definition list ${i + 1}:`);
      $(dl).find('dt').each((j, dt) => {
        const key = $(dt).text().trim();
        const value = $(dt).next('dd').text().trim();
        console.log(`  ${key}: ${value}`);
      });
      console.log('---');
    });

    // Method 4: Look for any element containing "SKU"
    console.log('\n=== ELEMENTS CONTAINING SKU ===\n');
    $('*').filter((i, el) => {
      return $(el).text().includes('SKU') && $(el).text().includes('SERIA1E810411CL2GBQPO');
    }).each((i, el) => {
      console.log('Found SKU element:');
      console.log('- Tag:', el.tagName);
      console.log('- Class:', $(el).attr('class'));
      console.log('- ID:', $(el).attr('id'));
      console.log('- Content:', $(el).text().substring(0, 500));
      console.log('- Parent:', el.parent ? el.parent.tagName : 'none');
      console.log('---');
    });

    // Method 5: Look for product-details or similar classes
    console.log('\n=== PRODUCT DETAIL CONTAINERS ===\n');
    $('.product-details, .product-info, .details, .specifications, .specs, .product-specs').each((i, container) => {
      console.log(`Container ${i + 1} (${container.tagName}.${$(container).attr('class')}):`);
      console.log($(container).text().substring(0, 300));
      console.log('---');
    });

    // Method 6: Raw search for specification terms
    console.log('\n=== RAW TEXT SEARCH FOR SPECIFICATIONS ===\n');
    const fullText = $('body').text();
    const skuMatch = fullText.match(/SKU\s*([\s\S]{0,100}?)(?=Categorii|Brand|$)/i);
    if (skuMatch) {
      console.log('Found SKU section:', skuMatch[0]);
    }

    const ramMatch = fullText.match(/Memorie RAM\s*([\s\S]{0,50}?)(?=Capacitate|Brand|$)/i);
    if (ramMatch) {
      console.log('Found RAM section:', ramMatch[0]);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDetaliiSection();