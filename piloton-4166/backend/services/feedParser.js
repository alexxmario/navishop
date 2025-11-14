const axios = require('axios');
const { parseString } = require('xml2js');
const cheerio = require('cheerio');
const Product = require('../models/Product');

class FeedParser {
  constructor() {
    this.feedUrl = 'https://www.navi-abc.ro/feed/google_xml/0dd00d87fcaef80b64aa73135f2c480c';
  }

  async fetchFeed() {
    try {
      const response = await axios.get(this.feedUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching feed:', error.message);
      throw error;
    }
  }

  async fetchProductPage(productUrl) {
    try {
      const response = await axios.get(productUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching product page ${productUrl}:`, error.message);
      return null;
    }
  }

  async extractRealSpecifications(productUrl) {
    try {
      const html = await this.fetchProductPage(productUrl);
      if (!html) return null;
      const $ = cheerio.load(html);

      // Extract from the product-details section (the clean "Detalii" section)
      const productDetails = $('.product-details');

      if (productDetails.length === 0) {
        console.log(`No product details section found for ${productUrl}`);
        return null;
      }

      // Get the raw text from the product details section
      let detailsText = productDetails.text();

      // Also extract additional content from product-meta-fields (for additional package info, etc.)
      const metaFields = $('.product-meta-fields');
      if (metaFields.length > 0) {
        const additionalText = metaFields.text();
        detailsText += '\n' + additionalText;
      }

      // Helper function to extract specification values
      const extractSpec = (text, key) => {
        // Create a more comprehensive regex pattern that captures ALL text until the next key
        const nextKeys = [
          'SKU', 'Categorii', 'Brand', 'Memorie RAM', 'Capacitate Stocare', 'Model Procesor',
          'Diagonala Display', 'Rezolutie Display', 'Tehnologie Display', 'Functii',
          'Conectivitate', 'Destinat pentru', 'Marca', 'Tip Montare', 'Preluare Comenzi',
          'Continut Pachet', 'Formate media', 'Sistem de Operare', 'Tip Slot',
          'Conexiuni Externe', 'Harta', 'TMC', 'Suport Aplicatii', 'Split Screen',
          'Limbi Interfata', 'Microfon', 'Bluetooth', 'Limitari', 'Garantie',
          'Observatii', 'Note', 'Mentiuni', 'Taguri'
        ];

        const keyPattern = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const nextKeysPattern = nextKeys.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

        const regex = new RegExp(keyPattern + '\\s*([\\s\\S]*?)(?=\\n\\s*(?:' + nextKeysPattern + ')\\s*|$)', 'i');

        const match = text.match(regex);
        if (match) {
          let result = match[1].trim().replace(/\s+/g, ' ').replace(/^\s*[\n\r]+/, '').replace(/[\n\r]+\s*$/, '');

          // Special cleanup for Limitări to remove Taguri section
          if (key.toLowerCase() === 'limitari') {
            // Remove everything from "Taguri" onwards
            result = result.replace(/\s*Taguri\s+.*$/i, '').trim();
            // Remove any trailing periods followed by spaces
            result = result.replace(/\.\s*$/, '').trim();
          }

          return result;
        }
        return null;
      };

      // Extract all specifications
      const specifications = {
        sku: extractSpec(detailsText, 'SKU'),
        categorii: extractSpec(detailsText, 'Categorii'),
        brand: extractSpec(detailsText, 'Brand'),
        memorieRAM: extractSpec(detailsText, 'Memorie RAM'),
        capacitateStocare: extractSpec(detailsText, 'Capacitate Stocare'),
        modelProcesor: extractSpec(detailsText, 'Model Procesor'),
        diagonalaDisplay: extractSpec(detailsText, 'Diagonala Display'),
        rezolutieDisplay: extractSpec(detailsText, 'Rezolutie Display'),
        tehnologieDisplay: extractSpec(detailsText, 'Tehnologie Display'),
        functii: extractSpec(detailsText, 'Functii'),
        conectivitate: extractSpec(detailsText, 'Conectivitate'),
        destinatPentru: extractSpec(detailsText, 'Destinat pentru'),
        marca: extractSpec(detailsText, 'Marca'),
        tipMontare: extractSpec(detailsText, 'Tip Montare'),
        preluareComenzi: extractSpec(detailsText, 'Preluare Comenzi Volan'),
        continutPachet: extractSpec(detailsText, 'Continut Pachet'),
        formateMedia: extractSpec(detailsText, 'Formate media suportate'),
        sistemOperare: extractSpec(detailsText, 'Sistem de Operare'),
        tipSlotMemorie: extractSpec(detailsText, 'Tip Slot Memorie'),
        conexiuniExterne: extractSpec(detailsText, 'Conexiuni Externe'),
        harta: extractSpec(detailsText, 'Harta'),
        tmc: extractSpec(detailsText, 'TMC'),
        suportAplicatii: extractSpec(detailsText, 'Suport Aplicatii Android'),
        splitScreen: extractSpec(detailsText, 'Split Screen'),
        limbiInterfata: extractSpec(detailsText, 'Limbi Interfata'),
        microfon: extractSpec(detailsText, 'Microfon'),
        bluetooth: extractSpec(detailsText, 'Bluetooth'),
        limitari: extractSpec(detailsText, 'Limitari'),
        garantie: extractSpec(detailsText, 'Garantie'),
        observatii: extractSpec(detailsText, 'Observatii'),
        note: extractSpec(detailsText, 'Note'),
        mentiuni: extractSpec(detailsText, 'Mentiuni')
      };

      // Organize into structured Romanian specs
      const romanianSpecs = {
        general: {
          sku: specifications.sku,
          brand: specifications.brand,
          categorii: specifications.categorii,
          sistemOperare: specifications.sistemOperare,
          marca: specifications.marca
        },
        hardware: {
          memorieRAM: specifications.memorieRAM,
          capacitateStocare: specifications.capacitateStocare,
          modelProcesor: specifications.modelProcesor
        },
        display: {
          diagonalaDisplay: specifications.diagonalaDisplay,
          rezolutieDisplay: specifications.rezolutieDisplay,
          tehnologieDisplay: specifications.tehnologieDisplay
        },
        connectivity: {
          conectivitate: (() => {
            let conn = (specifications.conectivitate || (specifications.bluetooth && specifications.bluetooth.includes(',') ? specifications.bluetooth : null))?.replace(/^[,\s]+/, '').trim();
            // Add Bluetooth if missing but other connectivity options exist
            if (conn && !conn.includes('Bluetooth')) {
              conn = 'Bluetooth, ' + conn;
            }
            return conn;
          })(),
          bluetooth: 'DA'
        },
        features: {
          functii: specifications.functii,
          suportAplicatii: specifications.suportAplicatii,
          splitScreen: specifications.splitScreen,
          harta: specifications.harta,
          tmc: specifications.tmc,
          limbiInterfata: specifications.limbiInterfata,
          microfon: specifications.microfon
        },
        compatibility: {
          destinatPentru: specifications.destinatPentru,
          tipMontare: specifications.tipMontare,
          preluareComenzi: specifications.preluareComenzi
        },
        additional: {
          limitari: specifications.limitari,
          garantie: specifications.garantie,
          observatii: specifications.observatii,
          note: specifications.note,
          mentiuni: specifications.mentiuni
        },
        package: {
          continutPachet: (() => {
            // Combine all instances of "Continut Pachet" from the text
            const allMatches = [];
            const regex = /Continut Pachet\s*([^]*?)(?=\n\s*(?:SKU|Categorii|Brand|Memorie RAM|Capacitate Stocare|Model Procesor|Diagonala Display|Rezolutie Display|Tehnologie Display|Functii|Conectivitate|Destinat pentru|Marca|Tip Montare|Preluare Comenzi|Continut Pachet|Formate media|Sistem de Operare|Tip Slot|Conexiuni Externe|Harta|TMC|Suport Aplicatii|Split Screen|Limbi Interfata|Microfon|Bluetooth|Limitari|Garantie|Observatii|Note|Mentiuni|Pret|Price|$)|\n\s*$)/gi;

            let match;
            while ((match = regex.exec(detailsText)) !== null) {
              const content = match[1].trim().replace(/\s+/g, ' ');
              if (content && content.length > 0 && !allMatches.includes(content)) {
                allMatches.push(content);
              }
            }

            if (allMatches.length > 0) {
              let combined = allMatches.join('. ');
              // Clean up duplicates and tags
              combined = combined.replace(/Taguri[^.]*\./g, '').trim();
              // Remove duplicate "Toate navigatiile" phrases
              combined = combined.replace(/(Toate navigatiile tip TABLETA[^.]*\.)\s*\1/g, '$1');
              return combined;
            }
            return specifications.continutPachet;
          })(),
          formateMedia: specifications.formateMedia,
          tipSlotMemorie: specifications.tipSlotMemorie,
          conexiuniExterne: specifications.conexiuniExterne
        }
      };

      // Remove empty categories
      Object.keys(romanianSpecs).forEach(category => {
        const hasValidSpecs = Object.values(romanianSpecs[category]).some(value =>
          value && value.trim() && value.trim() !== 'N/A' && value.trim() !== '-'
        );
        if (!hasValidSpecs) {
          romanianSpecs[category] = {};
        } else {
          // Clean up individual values
          Object.keys(romanianSpecs[category]).forEach(key => {
            const value = romanianSpecs[category][key];
            if (!value || value.trim() === '' || value.trim() === 'N/A' || value.trim() === '-') {
              delete romanianSpecs[category][key];
            }
          });
        }
      });

      return romanianSpecs;
    } catch (error) {
      console.error(`Error extracting specifications from ${productUrl}:`, error.message);
      return null;
    }
  }

  categorizeSpecification(key, value, romanianSpecs) {
    const keyLower = key.toLowerCase();

    // General specifications
    if (keyLower.includes('sku') || keyLower.includes('cod')) {
      romanianSpecs.general.sku = value;
    } else if (keyLower.includes('brand') || keyLower.includes('marca')) {
      romanianSpecs.general.brand = value;
    } else if (keyLower.includes('categori')) {
      romanianSpecs.general.categorii = value;
    } else if (keyLower.includes('sistem') && keyLower.includes('operare')) {
      romanianSpecs.general.sistemOperare = value;
    } else if (keyLower.includes('harta') || keyLower.includes('map')) {
      romanianSpecs.general.harta = value;
    } else if (keyLower.includes('tmc')) {
      romanianSpecs.general.tmc = value;
    }

    // Hardware specifications
    else if (keyLower.includes('procesor') || keyLower.includes('processor')) {
      romanianSpecs.hardware.modelProcesor = value;
    } else if (keyLower.includes('ram') || keyLower.includes('memorie')) {
      romanianSpecs.hardware.memorieRAM = value;
    } else if (keyLower.includes('stocare') || keyLower.includes('storage') || keyLower.includes('capacitate')) {
      romanianSpecs.hardware.capacitateStocare = value;
    }

    // Display specifications
    else if (keyLower.includes('diagonala') || keyLower.includes('inch') || keyLower.includes('marime') || keyLower.includes('size')) {
      romanianSpecs.display.diagonalaDisplay = value;
    } else if (keyLower.includes('tehnologie') && (keyLower.includes('display') || keyLower.includes('ecran'))) {
      romanianSpecs.display.tehnologieDisplay = value;
    } else if (keyLower.includes('rezolutie') || keyLower.includes('resolution')) {
      romanianSpecs.display.rezolutieDisplay = value;
    }

    // Features
    else if (keyLower.includes('functii') || keyLower.includes('features')) {
      romanianSpecs.features.functii = value;
    } else if (keyLower.includes('split') && keyLower.includes('screen')) {
      romanianSpecs.features.splitScreen = value;
    } else if (keyLower.includes('comenzi') && keyLower.includes('volan')) {
      romanianSpecs.features.preluareComenziVolan = value;
    } else if (keyLower.includes('aplicatii') && keyLower.includes('android')) {
      romanianSpecs.features.suportAplicatiiAndroid = value;
    } else if (keyLower.includes('limbi') || keyLower.includes('interfata')) {
      romanianSpecs.features.limbiInterfata = value;
    }

    // Connectivity
    else if (keyLower.includes('conectivitate') || keyLower.includes('connectivity')) {
      romanianSpecs.connectivity.conectivitate = value;
    } else if (keyLower.includes('bluetooth')) {
      romanianSpecs.connectivity.bluetooth = value;
    }

    // Compatibility
    else if (keyLower.includes('destinat') || keyLower.includes('compatibil')) {
      romanianSpecs.compatibility.destinatPentru = value;
    } else if (keyLower.includes('montare') || keyLower.includes('instalare')) {
      romanianSpecs.compatibility.tipMontare = value;
    }

    // Package
    else if (keyLower.includes('continut') || keyLower.includes('pachet')) {
      romanianSpecs.package.continutPachet = value;
    } else if (keyLower.includes('formate') && keyLower.includes('media')) {
      romanianSpecs.package.formateMediaSuportate = value;
    }
  }

  extractSpecsFromText(text, romanianSpecs) {
    // Extract specific patterns from the full text content

    // Look for SKU patterns
    const skuMatch = text.match(/SKU[:\s]*([A-Z0-9]+)/i);
    if (skuMatch) {
      romanianSpecs.general.sku = skuMatch[1].trim();
    }

    // Look for connectivity patterns - try multiple patterns
    // First look for the exact pattern we want
    let connectivityMatch = text.match(/(Bluetooth[,\s]*Cartela\s+Sim[,\s]*Subwoofer[,\s]*USB[,\s]*Wi-Fi)/i);
    if (!connectivityMatch) {
      // Look for any Bluetooth, Cartela Sim combination
      connectivityMatch = text.match(/(Bluetooth[,\s]+Cartela\s+Sim[,\s]+[^\.]+)/i);
    }
    if (!connectivityMatch) {
      // Look for general Conectivitate field
      connectivityMatch = text.match(/Conectivitate[:\s]*([^\.]+)/i);
    }
    if (!connectivityMatch) {
      // Look for any connectivity listing with common terms
      connectivityMatch = text.match(/(Bluetooth[,\s]+[^\.]*(?:USB|Wi-Fi|Subwoofer)[^\.]*)/i);
    }
    if (connectivityMatch) {
      romanianSpecs.connectivity.conectivitate = connectivityMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Look for Bluetooth patterns
    const bluetoothMatch = text.match(/Bluetooth[,\s]+([\w\s,]+?)(?:[\.;\n]|$)/i);
    if (bluetoothMatch) {
      romanianSpecs.connectivity.bluetooth = bluetoothMatch[1].trim();
    }

    // Extract processor information with different patterns
    let processorMatch = text.match(/Procesor[:\s]*([^\.]+)/i);
    if (!processorMatch) {
      processorMatch = text.match(/(Octa\s+Core|Quad\s+Core|8\s+Core|4\s+Core)/i);
    }
    if (processorMatch) {
      romanianSpecs.hardware.modelProcesor = processorMatch[1].trim();
    }

    // Extract RAM information
    let ramMatch = text.match(/RAM[:\s]*(\d+\s*GB)/i);
    if (!ramMatch) {
      ramMatch = text.match(/(\d+)\s*GB\s+(\d+)\s*GB/);
      if (ramMatch) {
        romanianSpecs.hardware.memorieRAM = `${ramMatch[1]}GB`;
        romanianSpecs.hardware.capacitateStocare = `${ramMatch[2]}GB`;
      }
    } else {
      romanianSpecs.hardware.memorieRAM = ramMatch[1].trim();
    }

    // Extract storage information
    const storageMatch = text.match(/Stocare[:\s]*(\d+\s*GB)/i);
    if (storageMatch) {
      romanianSpecs.hardware.capacitateStocare = storageMatch[1].trim();
    }

    // Extract diagonal display
    const diagonalMatch = text.match(/(\d+)\s*inch/i);
    if (diagonalMatch) {
      romanianSpecs.display.diagonalaDisplay = `${diagonalMatch[1]} inch`;
    }

    // Extract resolution with more patterns
    let resolutionMatch = text.match(/(\d+\s*x\s*\d+)/i);
    if (!resolutionMatch) {
      resolutionMatch = text.match(/(2K|4K|HD|Full\s*HD)/i);
    }
    if (resolutionMatch) {
      romanianSpecs.display.rezolutieDisplay = resolutionMatch[1];
    }

    // Extract display technology
    const displayTechMatch = text.match(/(QLED|INCELL|IPS|TFT|LCD)/i);
    if (displayTechMatch) {
      romanianSpecs.display.tehnologieDisplay = displayTechMatch[1].toUpperCase();
    }

    // Extract system information
    const osMatch = text.match(/Android[:\s]*([^\.]+)/i);
    if (osMatch) {
      romanianSpecs.general.sistemOperare = osMatch[1].trim();
    }

    // Extract brand information
    const brandMatch = text.match(/Brand[:\s]*([^\.]+)/i);
    if (brandMatch) {
      romanianSpecs.general.brand = brandMatch[1].trim();
    }
  }

  async parseFeed(xmlData) {
    return new Promise((resolve, reject) => {
      parseString(xmlData, { 
        explicitArray: false,
        trim: true,
        normalize: true
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async processProducts(feedData) {
    const entries = feedData.feed.entry || [];
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    const products = [];
    for (const entry of entriesArray) {
      try {
        const product = await this.processProduct(entry);
        if (product) {
          products.push(product);
        }
      } catch (error) {
        console.error('Error processing entry:', error);
      }
    }

    return products;
  }

  async processProduct(entry) {
    try {
      // Extract basic product info
      const externalId = entry['g:id'];
      const title = entry['g:title'];
      const description = entry['g:description'];
      const link = entry['g:link'];
      const price = this.parsePrice(entry['g:price']);
      const salePrice = this.parsePrice(entry['g:sale_price']);
      const brand = entry['g:brand'];
      const condition = entry['g:condition'];
      const availability = entry['g:availability'];
      const gtin = entry['g:gtin'];
      const mpn = entry['g:mpn'];
      const productType = entry['g:product_type'];

      // Extract images
      const images = this.extractImages(entry);

      // Generate slug from title
      const slug = this.generateSlug(title);

      // Use actual MPN as SKU instead of generating it
      const sku = mpn || this.generateSku(externalId, brand);

      // Extract car compatibility from title and product type
      const compatibility = this.extractCarCompatibility(title, productType);

      // Determine category based on title and product type
      const category = this.determineCategory(title, productType);

      // Extract detailed specifications from description (as fallback)
      const { detailedSpecs, technicalFeatures, displaySpecs, connectivityOptions } = this.extractDetailedSpecs(description, title);

      // Extract real specifications from the actual product page
      const romanianSpecs = await this.extractRealSpecifications(link);

      // Ensure SKU is set in romanianSpecs if available
      if (romanianSpecs && !romanianSpecs.general?.sku && sku) {
        if (!romanianSpecs.general) romanianSpecs.general = {};
        romanianSpecs.general.sku = sku;
      }

      return {
        externalId,
        name: title,
        description: this.cleanDescription(description),
        slug,
        sku,
        price: salePrice || price,
        originalPrice: salePrice ? price : null,
        discount: salePrice && price ? Math.round(((price - salePrice) / price) * 100) : 0,
        stock: availability === 'in_stock' ? 50 : 0, // Default stock level
        category,
        brand,
        images,
        compatibility,
        specifications: [
          { key: 'GTIN', value: gtin || 'N/A' },
          { key: 'MPN', value: mpn || 'N/A' },
          { key: 'Condition', value: condition || 'new' },
          { key: 'Product Type', value: productType || 'N/A' }
        ].filter(spec => spec.value !== 'N/A' && spec.value),
        // Enhanced specifications from description (fallback)
        detailedSpecs,
        displaySpecs,
        technicalFeatures,
        connectivityOptions,
        // Real specifications from product page
        romanianSpecs,
        externalLink: link,
        featured: false,
        onSale: salePrice && salePrice < price,
        averageRating: 4.5, // Default rating
        totalReviews: Math.floor(Math.random() * 50) + 10 // Random reviews count
      };
    } catch (error) {
      console.error('Error processing product:', error);
      return null;
    }
  }

  parsePrice(priceString) {
    if (!priceString) return null;
    const matches = priceString.match(/[\d,\.]+/);
    if (matches) {
      // Handle both comma as decimal separator and thousand separator
      let price = matches[0];
      if (price.includes(',') && price.includes('.')) {
        // Format like 1,234.56 - comma is thousand separator
        price = price.replace(',', '');
      } else if (price.includes(',') && !price.includes('.')) {
        // Format like 1,234 - could be thousand separator or decimal
        if (price.split(',')[1] && price.split(',')[1].length <= 2) {
          // Likely decimal: 1,50 -> 1.50
          price = price.replace(',', '.');
        } else {
          // Likely thousand separator: 1,234 -> 1234
          price = price.replace(',', '');
        }
      }
      return parseFloat(price);
    }
    return null;
  }

  extractImages(entry) {
    const images = [];
    
    // Main image
    if (entry['g:image_link']) {
      images.push({
        url: entry['g:image_link'],
        alt: entry['g:title'] || 'Product image',
        isPrimary: true
      });
    }

    // Additional images
    const additionalImages = entry['g:additional_image_link'];
    if (additionalImages) {
      const imageUrls = Array.isArray(additionalImages) ? additionalImages : [additionalImages];
      imageUrls.forEach((url, index) => {
        images.push({
          url,
          alt: `${entry['g:title'] || 'Product'} - Image ${index + 2}`,
          isPrimary: false
        });
      });
    }

    return images;
  }

  generateSlug(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .trim();
  }

  generateSku(externalId, brand) {
    const brandCode = (brand || 'UNK').substring(0, 3).toUpperCase();
    return `${brandCode}-${externalId}`;
  }

  extractCarCompatibility(title, productType) {
    const compatibility = [];
    
    // Extract brand and model from title
    const carBrands = [
      'Alfa Romeo', 'Audi', 'BMW', 'Mercedes', 'Volkswagen', 'Toyota', 
      'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
      'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
      'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet'
    ];

    // Look for car brands in title
    const titleUpper = title.toUpperCase();
    for (const brand of carBrands) {
      if (titleUpper.includes(brand.toUpperCase())) {
        // Extract model and years from title
        const modelMatch = title.match(new RegExp(`${brand}\\s+([A-Za-z0-9\\s\\-]+)\\s+(\\d{4})`, 'i'));
        if (modelMatch) {
          const model = modelMatch[1].trim();
          const yearMatch = title.match(/(\d{4})-?(\d{4})?/);
          
          compatibility.push({
            brand: brand,
            model: model,
            yearFrom: yearMatch ? parseInt(yearMatch[1]) : null,
            yearTo: yearMatch && yearMatch[2] ? parseInt(yearMatch[2]) : null
          });
        } else {
          // Just brand without specific model
          compatibility.push({
            brand: brand,
            model: 'Various',
            yearFrom: null,
            yearTo: null
          });
        }
        break; // Only match first brand found
      }
    }

    // If no compatibility found from title, try product type
    if (compatibility.length === 0 && productType) {
      const typeMatch = productType.match(/^([^(]+)/);
      if (typeMatch) {
        compatibility.push({
          brand: 'Universal',
          model: typeMatch[1].trim(),
          yearFrom: null,
          yearTo: null
        });
      }
    }

    return compatibility;
  }

  determineCategory(title, productType) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('navigatie') || titleLower.includes('gps')) {
      return 'navigatii-gps';
    }
    if (titleLower.includes('carplay') || titleLower.includes('android auto')) {
      return 'carplay-android';
    }
    if (titleLower.includes('camera') || titleLower.includes('marsarier')) {
      return 'camere-marsarier';
    }
    if (titleLower.includes('dvr') || titleLower.includes('recorder')) {
      return 'dvr';
    }
    
    return 'accesorii'; // Default category
  }

  cleanDescription(description) {
    if (!description) return '';

    // Remove CDATA wrapper if present
    let cleaned = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Keep full description for structured parsing
    return cleaned;
  }

  extractDetailedSpecs(description, title = '') {
    if (!description) return { detailedSpecs: {}, technicalFeatures: [], displaySpecs: {}, connectivityOptions: [] };

    // Remove CDATA wrapper if present
    let content = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');

    const detailedSpecs = {};
    const technicalFeatures = [];
    const connectivityOptions = [];
    const displaySpecs = {};

    // Extract processor information
    const processorMatch = content.match(/Procesor\s+(Quad\s+Core|Octa\s+Core|8\s+CORE|4\s+CORE)/i);
    if (processorMatch) {
      detailedSpecs.processor = processorMatch[1].replace(/(\d+)\s+CORE/i, '$1 Core');
    }

    // Extract RAM and storage
    const ramStorageMatch = content.match(/(\d+)\s*GB\s+(\d+)\s*GB/);
    if (ramStorageMatch) {
      detailedSpecs.ram = `${ramStorageMatch[1]}GB`;
      detailedSpecs.storage = `${ramStorageMatch[2]}GB`;
    }

    // Alternative pattern for RAM and storage in title
    const titleRamStorage = title.match(/(\d+)GB\s+(\d+)GB/);
    if (titleRamStorage && !ramStorageMatch) {
      detailedSpecs.ram = `${titleRamStorage[1]}GB`;
      detailedSpecs.storage = `${titleRamStorage[2]}GB`;
    }

    // Extract screen size
    const screenMatch = content.match(/(\d+)\s*inch/i) || title.match(/(\d+)\s*inch/i);
    if (screenMatch) {
      displaySpecs.screenSize = `${screenMatch[1]} inch`;
    }

    // Extract display technology
    const displayTechMatch = content.match(/(INCELL|QLED|2K)/i);
    if (displayTechMatch) {
      displaySpecs.technology = displayTechMatch[1].toUpperCase();
    }

    // Extract resolution
    if (content.includes('2K')) {
      displaySpecs.resolution = '2K';
    }

    // Extract connectivity features
    if (content.match(/CarPlay.*Android\s+Auto.*Wireless/i) || content.match(/Android\s+Auto.*CarPlay.*Wireless/i)) {
      connectivityOptions.push('CarPlay & Android Auto Wireless');
    }

    if (content.includes('Bluetooth')) {
      connectivityOptions.push('Bluetooth');
    }

    if (content.match(/Wi-Fi.*2\.4G/i)) {
      connectivityOptions.push('Wi-Fi 2.4G');
    }

    if (content.match(/4G\s+LTE/i)) {
      connectivityOptions.push('4G LTE');
    }

    if (content.includes('AUX')) {
      connectivityOptions.push('AUX');
    }

    if (content.includes('USB')) {
      connectivityOptions.push('USB');
    }

    // Extract technical features
    if (content.match(/Control\s+de\s+pe\s+volan/i) || content.match(/Steering\s+Wheel\s+Controls/i)) {
      technicalFeatures.push('Steering Wheel Controls');
    }

    if (content.match(/Plug\s*&\s*Play/i)) {
      technicalFeatures.push('Plug & Play Installation');
    }

    if (content.match(/GPS.*integrat/i) || content.match(/navigație.*GPS/i)) {
      technicalFeatures.push('GPS Navigation');
    }

    if (content.match(/Waze.*Google\s+Maps/i)) {
      technicalFeatures.push('Waze & Google Maps Support');
    }

    if (content.match(/DVR/i)) {
      technicalFeatures.push('DVR Support');
    }

    if (content.match(/cameră.*marșarier/i) || content.match(/camera.*marsarier/i)) {
      technicalFeatures.push('Rear Camera Support');
    }

    if (content.match(/cameră.*frontală/i)) {
      technicalFeatures.push('Front Camera Support');
    }

    if (content.match(/Radio\s+FM\/AM/i)) {
      technicalFeatures.push('FM/AM Radio');
    }

    if (content.match(/RDS/i)) {
      technicalFeatures.push('RDS');
    }

    if (content.match(/Ecran\s+Împărțit/i) || content.match(/Split.*Screen/i)) {
      technicalFeatures.push('Split Screen');
    }

    if (content.match(/Multitasking/i)) {
      technicalFeatures.push('Multitasking');
    }

    if (content.match(/egalizator.*procesor\s+DSP/i) || content.match(/DSP/i)) {
      technicalFeatures.push('DSP Sound Processor');
    }

    if (content.match(/Senzori.*parcare/i)) {
      technicalFeatures.push('Parking Sensors Integration');
    }

    if (content.match(/climatizare/i)) {
      technicalFeatures.push('Climate Control Integration');
    }

    if (content.match(/încălzire.*scaune/i)) {
      technicalFeatures.push('Heated Seats Control');
    }

    // Extract audio features
    if (content.match(/posturi.*online/i)) {
      technicalFeatures.push('Online Radio');
    }

    if (content.match(/comenzi.*vocale/i) || content.match(/Siri.*Google\s+Assistant/i)) {
      technicalFeatures.push('Voice Commands (Siri/Google Assistant)');
    }

    return {
      detailedSpecs,
      technicalFeatures: [...new Set(technicalFeatures)], // Remove duplicates
      displaySpecs,
      connectivityOptions: [...new Set(connectivityOptions)] // Remove duplicates
    };
  }

  async syncProducts() {
    try {
      console.log('Starting product sync from feed...');
      
      // Fetch and parse feed
      const xmlData = await this.fetchFeed();
      const feedData = await this.parseFeed(xmlData);
      
      // Process products
      const products = await this.processProducts(feedData);
      console.log(`Processed ${products.length} products from feed`);
      
      let synced = 0;
      let errors = 0;
      
      // Sync each product
      for (const productData of products) {
        try {
          await this.syncProduct(productData);
          synced++;
        } catch (error) {
          console.error(`Error syncing product ${productData.externalId}:`, error.message);
          errors++;
        }
      }
      
      console.log(`Sync completed: ${synced} products synced, ${errors} errors`);
      return { synced, errors, total: products.length };
      
    } catch (error) {
      console.error('Error in syncProducts:', error);
      throw error;
    }
  }

  async syncProduct(productData) {
    try {
      // Check if product already exists by external ID
      let product = await Product.findOne({ externalId: productData.externalId });

      // If not found by externalId, try to find by slug (for existing products without externalId)
      if (!product && productData.slug) {
        product = await Product.findOne({ slug: productData.slug });
      }

      if (product) {
        // Update existing product
        Object.assign(product, productData);
        product.updatedAt = new Date();
        console.log(`Updated existing product: ${productData.name}`);
      } else {
        // Create new product
        product = new Product({
          ...productData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created new product: ${productData.name}`);
      }

      await product.save();
      return product;

    } catch (error) {
      console.error(`Error syncing product ${productData.externalId}:`, error);
      throw error;
    }
  }
}

module.exports = FeedParser;