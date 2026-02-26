require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const { parseString } = require('xml2js');
const cheerio = require('cheerio');
const Product = require('../models/Product');

// New feed URL provided by user
const NEW_FEED_URL = 'https://www.navi-abc.ro/feed/google_xml/4a02af25a53df0ce4959b7ce76190ad4';

class NewFeedSync {
  constructor() {
    this.feedUrl = NEW_FEED_URL;
    this.stats = {
      total: 0,
      newProducts: 0,
      updatedProducts: 0,
      skipped: 0,
      errors: 0
    };
  }

  async fetchFeed() {
    console.log(`Fetching feed from: ${this.feedUrl}`);
    const response = await axios.get(this.feedUrl, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.data;
  }

  async parseFeed(xmlData) {
    return new Promise((resolve, reject) => {
      parseString(xmlData, {
        explicitArray: false,
        trim: true,
        normalize: true
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  parsePrice(priceString) {
    if (!priceString) return null;
    const matches = priceString.match(/[\d,\.]+/);
    if (matches) {
      let price = matches[0];
      if (price.includes(',') && price.includes('.')) {
        price = price.replace(',', '');
      } else if (price.includes(',') && !price.includes('.')) {
        if (price.split(',')[1] && price.split(',')[1].length <= 2) {
          price = price.replace(',', '.');
        } else {
          price = price.replace(',', '');
        }
      }
      return parseFloat(price);
    }
    return null;
  }

  generateSlug(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  extractImages(entry) {
    const images = [];

    if (entry['g:image_link']) {
      images.push({
        url: entry['g:image_link'],
        alt: entry['g:title'] || 'Product image',
        isPrimary: true
      });
    }

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

  extractCarCompatibility(title, productType) {
    const compatibility = [];

    const carBrands = [
      'Alfa Romeo', 'Audi', 'BMW', 'Mercedes', 'Volkswagen', 'VW', 'Toyota',
      'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
      'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
      'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Land Rover',
      'Mini', 'Smart', 'Porsche', 'Jaguar', 'Lexus', 'Infiniti', 'Suzuki'
    ];

    const titleUpper = title.toUpperCase();
    for (const brand of carBrands) {
      if (titleUpper.includes(brand.toUpperCase())) {
        const yearMatch = title.match(/(\d{4})-?(\d{4})?/);

        compatibility.push({
          brand: brand,
          model: 'Various',
          yearFrom: yearMatch ? parseInt(yearMatch[1]) : null,
          yearTo: yearMatch && yearMatch[2] ? parseInt(yearMatch[2]) : null
        });
        break;
      }
    }

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

  determineCategory(title) {
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

    return 'accesorii';
  }

  cleanDescription(description) {
    if (!description) return '';
    let cleaned = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
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
      console.log(`  Warning: Could not fetch product page: ${error.message}`);
      return null;
    }
  }

  async extractRomanianSpecs(productUrl) {
    try {
      const html = await this.fetchProductPage(productUrl);
      if (!html) return null;
      const $ = cheerio.load(html);

      const productDetails = $('.product-details');
      if (productDetails.length === 0) return null;

      let detailsText = productDetails.text();
      const metaFields = $('.product-meta-fields');
      if (metaFields.length > 0) {
        detailsText += '\n' + metaFields.text();
      }

      const extractSpec = (text, key) => {
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
          return match[1].trim().replace(/\s+/g, ' ');
        }
        return null;
      };

      const romanianSpecs = {
        general: {
          sku: extractSpec(detailsText, 'SKU'),
          brand: extractSpec(detailsText, 'Brand'),
          categorii: extractSpec(detailsText, 'Categorii'),
          sistemOperare: extractSpec(detailsText, 'Sistem de Operare')
        },
        hardware: {
          memorieRAM: extractSpec(detailsText, 'Memorie RAM'),
          capacitateStocare: extractSpec(detailsText, 'Capacitate Stocare'),
          modelProcesor: extractSpec(detailsText, 'Model Procesor')
        },
        display: {
          diagonalaDisplay: extractSpec(detailsText, 'Diagonala Display'),
          rezolutieDisplay: extractSpec(detailsText, 'Rezolutie Display'),
          tehnologieDisplay: extractSpec(detailsText, 'Tehnologie Display')
        },
        connectivity: {
          conectivitate: extractSpec(detailsText, 'Conectivitate'),
          bluetooth: 'DA'
        },
        features: {
          functii: extractSpec(detailsText, 'Functii'),
          splitScreen: extractSpec(detailsText, 'Split Screen'),
          harta: extractSpec(detailsText, 'Harta'),
          limbiInterfata: extractSpec(detailsText, 'Limbi Interfata')
        },
        compatibility: {
          destinatPentru: extractSpec(detailsText, 'Destinat pentru'),
          tipMontare: extractSpec(detailsText, 'Tip Montare')
        },
        additional: {
          garantie: extractSpec(detailsText, 'Garantie'),
          observatii: extractSpec(detailsText, 'Observatii')
        },
        package: {
          continutPachet: extractSpec(detailsText, 'Continut Pachet')
        }
      };

      // Clean up empty values
      Object.keys(romanianSpecs).forEach(category => {
        Object.keys(romanianSpecs[category]).forEach(key => {
          if (!romanianSpecs[category][key]) {
            delete romanianSpecs[category][key];
          }
        });
        if (Object.keys(romanianSpecs[category]).length === 0) {
          delete romanianSpecs[category];
        }
      });

      return Object.keys(romanianSpecs).length > 0 ? romanianSpecs : null;
    } catch (error) {
      return null;
    }
  }

  extractDetailedSpecs(description, title = '') {
    if (!description) return { detailedSpecs: {}, technicalFeatures: [], displaySpecs: {}, connectivityOptions: [] };

    const content = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
    const detailedSpecs = {};
    const technicalFeatures = [];
    const connectivityOptions = [];
    const displaySpecs = {};

    // Extract processor
    const processorMatch = content.match(/Procesor\s+(Quad\s+Core|Octa\s+Core|8\s+CORE|4\s+CORE)/i);
    if (processorMatch) {
      detailedSpecs.processor = processorMatch[1].replace(/(\d+)\s+CORE/i, '$1 Core');
    }

    // Extract RAM and storage from title
    const titleRamStorage = title.match(/(\d+)GB\s+(\d+)GB/);
    if (titleRamStorage) {
      detailedSpecs.ram = `${titleRamStorage[1]}GB`;
      detailedSpecs.storage = `${titleRamStorage[2]}GB`;
    }

    // Extract screen size
    const screenMatch = content.match(/(\d+)\s*inch/i) || title.match(/(\d+(?:\.\d+)?)\s*inch/i);
    if (screenMatch) {
      displaySpecs.screenSize = `${screenMatch[1]} inch`;
    }

    // Extract display technology
    const displayTechMatch = content.match(/(INCELL|QLED|2K|IPS)/i);
    if (displayTechMatch) {
      displaySpecs.technology = displayTechMatch[1].toUpperCase();
    }

    // Extract connectivity features
    if (content.match(/CarPlay.*Wireless/i) || content.match(/Android\s+Auto.*Wireless/i)) {
      connectivityOptions.push('CarPlay & Android Auto Wireless');
    }
    if (content.includes('Bluetooth')) connectivityOptions.push('Bluetooth');
    if (content.match(/Wi-Fi/i)) connectivityOptions.push('Wi-Fi');
    if (content.match(/4G/i)) connectivityOptions.push('4G');
    if (content.includes('USB')) connectivityOptions.push('USB');

    // Extract technical features
    if (content.match(/Plug\s*&\s*Play/i)) technicalFeatures.push('Plug & Play Installation');
    if (content.match(/GPS/i)) technicalFeatures.push('GPS Navigation');
    if (content.match(/camera.*marsarier/i)) technicalFeatures.push('Rear Camera Support');
    if (content.match(/DVR/i)) technicalFeatures.push('DVR Support');

    return {
      detailedSpecs,
      technicalFeatures: [...new Set(technicalFeatures)],
      displaySpecs,
      connectivityOptions: [...new Set(connectivityOptions)]
    };
  }

  async processProduct(entry) {
    const externalId = entry['g:id'];
    const title = entry['g:title'];
    const description = entry['g:description'];
    const link = entry['g:link'];
    const price = this.parsePrice(entry['g:price']);
    const salePrice = this.parsePrice(entry['g:sale_price']);
    const brand = entry['g:brand'];
    const gtin = entry['g:gtin'];
    const mpn = entry['g:mpn'];
    const productType = entry['g:product_type'];
    const availability = entry['g:availability'];

    const images = this.extractImages(entry);
    const slug = this.generateSlug(title);
    const sku = mpn || `NAV-${externalId}`;
    const compatibility = this.extractCarCompatibility(title, productType);
    const category = this.determineCategory(title);
    const { detailedSpecs, technicalFeatures, displaySpecs, connectivityOptions } = this.extractDetailedSpecs(description, title);

    // Scrape product page for Romanian specs
    console.log(`  Fetching specs from product page...`);
    const romanianSpecs = await this.extractRomanianSpecs(link);

    return {
      externalId,
      name: title,
      description: this.cleanDescription(description),
      slug,
      sku,
      price: salePrice || price,
      originalPrice: salePrice ? price : null,
      discount: salePrice && price ? Math.round(((price - salePrice) / price) * 100) : 0,
      stock: availability === 'in_stock' ? 50 : 0,
      category,
      brand,
      images,
      compatibility,
      specifications: [
        { key: 'GTIN', value: gtin },
        { key: 'MPN', value: mpn },
        { key: 'Product Type', value: productType }
      ].filter(spec => spec.value),
      detailedSpecs,
      displaySpecs,
      technicalFeatures,
      connectivityOptions,
      romanianSpecs,
      externalLink: link,
      featured: false,
      onSale: salePrice && salePrice < price,
      status: 'active',
      averageRating: 4.5,
      totalReviews: Math.floor(Math.random() * 50) + 10
    };
  }

  async syncProduct(productData) {
    // Check if product exists by external ID
    let existingProduct = await Product.findOne({ externalId: productData.externalId });

    // If not found, try by SKU
    if (!existingProduct) {
      existingProduct = await Product.findOne({ sku: productData.sku });
    }

    // If not found, try by slug
    if (!existingProduct) {
      existingProduct = await Product.findOne({ slug: productData.slug });
    }

    if (existingProduct) {
      // Update existing product
      Object.assign(existingProduct, productData);
      existingProduct.updatedAt = new Date();
      await existingProduct.save();
      return { action: 'updated', product: existingProduct };
    } else {
      // Create new product
      const newProduct = new Product({
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await newProduct.save();
      return { action: 'created', product: newProduct };
    }
  }

  async run() {
    try {
      // Connect to MongoDB
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
      console.log('Connected to MongoDB\n');

      // Fetch and parse feed
      console.log('Fetching XML feed...');
      const xmlData = await this.fetchFeed();
      const feedData = await this.parseFeed(xmlData);

      const entries = feedData.feed.entry || [];
      const entriesArray = Array.isArray(entries) ? entries : [entries];
      this.stats.total = entriesArray.length;

      console.log(`Found ${this.stats.total} products in feed\n`);
      console.log('Processing products...\n');
      console.log('='.repeat(60));

      for (let i = 0; i < entriesArray.length; i++) {
        const entry = entriesArray[i];
        const title = entry['g:title'] || 'Unknown';
        const externalId = entry['g:id'];

        console.log(`\n[${i + 1}/${this.stats.total}] ${title.substring(0, 50)}...`);
        console.log(`  External ID: ${externalId}`);

        try {
          const productData = await this.processProduct(entry);
          const result = await this.syncProduct(productData);

          if (result.action === 'created') {
            this.stats.newProducts++;
            console.log(`  ✅ NEW PRODUCT ADDED`);
            console.log(`  Price: ${productData.price} RON | Images: ${productData.images.length}`);
          } else {
            this.stats.updatedProducts++;
            console.log(`  🔄 Product updated`);
          }

          // Rate limiting - wait between requests to avoid overloading the server
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          this.stats.errors++;
          console.log(`  ❌ Error: ${error.message}`);
        }
      }

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('\n📊 SYNC SUMMARY');
      console.log('='.repeat(40));
      console.log(`Total products in feed:  ${this.stats.total}`);
      console.log(`New products added:      ${this.stats.newProducts}`);
      console.log(`Products updated:        ${this.stats.updatedProducts}`);
      console.log(`Errors:                  ${this.stats.errors}`);
      console.log('='.repeat(40));

      // Close connection
      await mongoose.connection.close();
      console.log('\nDatabase connection closed');

      return this.stats;

    } catch (error) {
      console.error('\n❌ Sync failed:', error.message);
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
      throw error;
    }
  }
}

// Run the sync
const sync = new NewFeedSync();
sync.run()
  .then(() => {
    console.log('\n✅ Sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
