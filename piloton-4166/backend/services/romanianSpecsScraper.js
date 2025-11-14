const axios = require('axios');
const cheerio = require('cheerio');

class RomanianSpecsScraper {
  constructor() {
    this.baseDelay = 1000; // 1 second between requests
    this.retryDelay = 3000; // 3 seconds for retries
    this.maxRetries = 3;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapeProductDetails(productUrl) {
    if (!productUrl) {
      console.log('No URL provided');
      return null;
    }

    try {
      console.log(`Scraping: ${productUrl}`);

      const response = await axios.get(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const details = {};

      // Look for the details/specifications section
      // Try multiple selectors to find the specifications
      const possibleSelectors = [
        '.product-details table tr',
        '.specifications table tr',
        '.detalii table tr',
        '.product-specs table tr',
        'table tr',
        '.tab-content table tr',
        '[id*="detalii"] table tr',
        '[class*="detalii"] table tr',
        '[id*="spec"] table tr',
        '[class*="spec"] table tr'
      ];

      let specsFound = false;

      for (const selector of possibleSelectors) {
        const rows = $(selector);
        if (rows.length > 0) {
          console.log(`Found ${rows.length} rows with selector: ${selector}`);

          rows.each((index, element) => {
            const $row = $(element);
            const cells = $row.find('td');

            if (cells.length >= 2) {
              const key = $(cells[0]).text().trim();
              const value = $(cells[1]).text().trim();

              if (key && value && key.length > 0 && value.length > 0) {
                // Clean up the key (remove colons, extra spaces)
                const cleanKey = key.replace(/[:\s]+$/, '').trim();
                if (cleanKey.length > 0 && !cleanKey.toLowerCase().includes('specificatii') && !cleanKey.toLowerCase().includes('detalii')) {
                  details[cleanKey] = value;
                  specsFound = true;
                }
              }
            }
          });

          if (specsFound) {
            console.log(`Successfully extracted ${Object.keys(details).length} specifications`);
            break;
          }
        }
      }

      // If no table found, try to extract from definition lists or other structures
      if (!specsFound) {
        console.log('No table found, trying alternative extraction methods...');

        // Try definition lists
        const dlItems = $('dl dt, dl dd');
        let currentKey = null;

        dlItems.each((index, element) => {
          const $element = $(element);
          if ($element.is('dt')) {
            currentKey = $element.text().trim().replace(/[:\s]+$/, '');
          } else if ($element.is('dd') && currentKey) {
            const value = $element.text().trim();
            if (value) {
              details[currentKey] = value;
              specsFound = true;
            }
            currentKey = null;
          }
        });

        // Try looking for list items or structured text
        if (!specsFound) {
          console.log('Trying to extract from lists and text patterns...');

          // Look for specifications in list items
          const listItems = $('li, p, div').filter((index, element) => {
            const text = $(element).text();
            return text.includes(':') && (
              text.toLowerCase().includes('sku') ||
              text.toLowerCase().includes('ram') ||
              text.toLowerCase().includes('procesor') ||
              text.toLowerCase().includes('display') ||
              text.toLowerCase().includes('stocare') ||
              text.toLowerCase().includes('categorii') ||
              text.toLowerCase().includes('brand')
            );
          });

          listItems.each((index, element) => {
            const $element = $(element);
            const text = $element.text().trim();

            // Split by colon to get key-value pairs
            const colonIndex = text.indexOf(':');
            if (colonIndex > 0) {
              const key = text.substring(0, colonIndex).trim();
              const value = text.substring(colonIndex + 1).trim();
              if (key && value && key.length > 0 && value.length > 0) {
                details[key] = value;
                specsFound = true;
              }
            }
          });
        }

        // Try searching for specific patterns in the page text
        if (!specsFound) {
          console.log('Trying pattern-based extraction...');

          const pageText = $('body').text();
          const lines = pageText.split('\n');

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(':')) {
              // Check if this looks like a specification line
              const colonIndex = trimmedLine.indexOf(':');
              const key = trimmedLine.substring(0, colonIndex).trim();
              const value = trimmedLine.substring(colonIndex + 1).trim();

              if (key && value && key.length > 0 && value.length > 0 && key.length < 50) {
                // Filter for relevant specifications
                const keyLower = key.toLowerCase();
                if (keyLower.includes('sku') ||
                    keyLower.includes('ram') ||
                    keyLower.includes('procesor') ||
                    keyLower.includes('display') ||
                    keyLower.includes('stocare') ||
                    keyLower.includes('categorii') ||
                    keyLower.includes('brand') ||
                    keyLower.includes('functii') ||
                    keyLower.includes('conectivitate') ||
                    keyLower.includes('destinat') ||
                    keyLower.includes('marca') ||
                    keyLower.includes('montare') ||
                    keyLower.includes('comenzi') ||
                    keyLower.includes('continut') ||
                    keyLower.includes('formate') ||
                    keyLower.includes('sistem') ||
                    keyLower.includes('harta') ||
                    keyLower.includes('tmc') ||
                    keyLower.includes('split') ||
                    keyLower.includes('limbi') ||
                    keyLower.includes('microfon') ||
                    keyLower.includes('bluetooth') ||
                    keyLower.includes('aplicatii') ||
                    keyLower.includes('diagonala') ||
                    keyLower.includes('rezolutie') ||
                    keyLower.includes('tehnologie') ||
                    keyLower.includes('capacitate') ||
                    keyLower.includes('memorie') ||
                    keyLower.includes('model')) {
                  details[key] = value;
                  specsFound = true;
                }
              }
            }
          }
        }
      }

      // Organize the details into structured categories
      const structuredDetails = this.structureDetails(details);

      if (Object.keys(details).length > 0) {
        console.log(`Successfully scraped ${Object.keys(details).length} details from ${productUrl}`);
        return {
          url: productUrl,
          rawDetails: details,
          structuredDetails: structuredDetails,
          scrapedAt: new Date()
        };
      } else {
        console.log(`No details found for ${productUrl}`);
        return null;
      }

    } catch (error) {
      console.error(`Error scraping ${productUrl}:`, error.message);
      return null;
    }
  }

  structureDetails(rawDetails) {
    const structured = {
      hardware: {},
      display: {},
      connectivity: {},
      features: {},
      package: {},
      compatibility: {},
      general: {}
    };

    Object.entries(rawDetails).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();

      // Hardware specifications
      if (lowerKey.includes('memorie') && lowerKey.includes('ram')) {
        structured.hardware.memorieRAM = value;
      } else if (lowerKey.includes('capacitate') && lowerKey.includes('stocare')) {
        structured.hardware.capacitateStocare = value;
      } else if (lowerKey.includes('procesor')) {
        structured.hardware.modelProcesor = value;
      }

      // Display specifications
      else if (lowerKey.includes('diagonala') && lowerKey.includes('display')) {
        structured.display.diagonalaDisplay = value;
      } else if (lowerKey.includes('rezolutie') && lowerKey.includes('display')) {
        structured.display.rezolutieDisplay = value;
      } else if (lowerKey.includes('tehnologie') && lowerKey.includes('display')) {
        structured.display.tehnologieDisplay = value;
      }

      // Connectivity
      else if (lowerKey.includes('conectivitate')) {
        structured.connectivity.conectivitate = value;
      } else if (lowerKey.includes('bluetooth')) {
        structured.connectivity.bluetooth = value;
      } else if (lowerKey.includes('wi-fi') || lowerKey.includes('wifi')) {
        structured.connectivity.wifi = value;
      }

      // Features
      else if (lowerKey.includes('functii')) {
        structured.features.functii = value;
      } else if (lowerKey.includes('split') && lowerKey.includes('screen')) {
        structured.features.splitScreen = value;
      } else if (lowerKey.includes('aplicatii') && lowerKey.includes('android')) {
        structured.features.suportAplicatiiAndroid = value;
      } else if (lowerKey.includes('limbi') && lowerKey.includes('interfata')) {
        structured.features.limbiInterfata = value;
      } else if (lowerKey.includes('comenzi') && lowerKey.includes('volan')) {
        structured.features.preluareComenziVolan = value;
      }

      // Package contents
      else if (lowerKey.includes('continut') && lowerKey.includes('pachet')) {
        structured.package.continutPachet = value;
      } else if (lowerKey.includes('formate') && lowerKey.includes('media')) {
        structured.package.formateMediaSuportate = value;
      }

      // Compatibility
      else if (lowerKey.includes('destinat') && lowerKey.includes('pentru')) {
        structured.compatibility.destinatPentru = value;
      } else if (lowerKey.includes('marca') && !lowerKey.includes('format')) {
        structured.compatibility.marca = value;
      } else if (lowerKey.includes('tip') && lowerKey.includes('montare')) {
        structured.compatibility.tipMontare = value;
      }

      // General
      else if (lowerKey.includes('sku')) {
        structured.general.sku = value;
      } else if (lowerKey.includes('categorii')) {
        structured.general.categorii = value;
      } else if (lowerKey.includes('brand')) {
        structured.general.brand = value;
      } else if (lowerKey.includes('sistem') && lowerKey.includes('operare')) {
        structured.general.sistemOperare = value;
      } else if (lowerKey.includes('harta')) {
        structured.general.harta = value;
      } else if (lowerKey.includes('tmc')) {
        structured.general.tmc = value;
      } else {
        // Put unmatched items in general
        structured.general[key] = value;
      }
    });

    return structured;
  }

  async scrapeProductWithRetry(productUrl, retries = 0) {
    try {
      const result = await this.scrapeProductDetails(productUrl);
      if (result) {
        await this.delay(this.baseDelay);
        return result;
      } else if (retries < this.maxRetries) {
        console.log(`Retry ${retries + 1}/${this.maxRetries} for ${productUrl}`);
        await this.delay(this.retryDelay);
        return this.scrapeProductWithRetry(productUrl, retries + 1);
      }
      return null;
    } catch (error) {
      if (retries < this.maxRetries) {
        console.log(`Retry ${retries + 1}/${this.maxRetries} for ${productUrl} due to error:`, error.message);
        await this.delay(this.retryDelay);
        return this.scrapeProductWithRetry(productUrl, retries + 1);
      }
      throw error;
    }
  }
}

module.exports = RomanianSpecsScraper;