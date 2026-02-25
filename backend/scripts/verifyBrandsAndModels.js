require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Brands listed on homepage (from HomePage.jsx)
const HOMEPAGE_BRANDS = [
  'Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Porsche', 'Ford', 'Opel', 'Dacia',
  'Renault', 'Peugeot', 'Citroen', 'Toyota', 'Honda', 'Hyundai', 'Mazda',
  'Suzuki', 'Mitsubishi', 'Alfa Romeo', 'Subaru', 'Volvo', 'Isuzu', 'Nissan',
  'Kia', 'Skoda', 'Seat', 'Fiat', 'Jeep', 'Chevrolet'
];

// Brands with fallback models in BrandPage.jsx
const FALLBACK_BRAND_MODELS = {
  audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'TT'],
  bmw: ['Seria 1', 'Seria 3', 'Seria 5', 'X1', 'X3', 'X5'],
  mercedes: ['A Class', 'B Class', 'C Class', 'E Class', 'CLS', 'ML', 'Sprinter', 'Viano', 'Vito'],
  volkswagen: ['Golf', 'Passat', 'Polo', 'Tiguan', 'Touran', 'Jetta', 'Amarok', 'Arteon', 'Sharan', 'Touareg', 'T-Cross', 'T-Roc', 'Scirocco', 'Taigo', 'Transporter', 'Caravelle', 'Multivan', 'Crafter'],
  toyota: ['Auris', 'Avensis', 'Aygo', 'Corolla', 'CHR', 'Hilux', 'Land Cruiser', 'Prius', 'Proace', 'Rav4', 'Yaris'],
  ford: ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'Ranger', 'Transit', 'EcoSport', 'Galaxy', 'S-Max'],
  opel: ['Astra', 'Corsa', 'Insignia', 'Mokka', 'Zafira', 'Vectra', 'Meriva', 'Antara', 'Vivaro'],
  dacia: ['Logan', 'Sandero', 'Duster', 'Lodgy', 'Dokker', 'Jogger'],
  renault: ['Clio', 'Megane', 'Captur', 'Kadjar', 'Koleos', 'Trafic', 'Master'],
  peugeot: ['206', '207', '208', '307', '308', '407', '508', '2008', '3008', '5008'],
  citroen: ['C1', 'C4', 'C5', 'Berlingo', 'Jumper', 'Jumpy'],
  honda: ['Civic', 'Accord', 'CRV'],
  nissan: ['Qashqai', 'X-Trail', 'Juke', 'Navara', 'Pathfinder'],
  hyundai: ['i10', 'i20', 'i30', 'Elantra', 'Tucson', 'Santa Fe', 'Kona'],
  kia: ['Ceed', 'Sportage', 'Sorento'],
  mazda: ['3', '5', '6', 'CX5', 'CX7', 'BT-50', 'MX-5'],
  skoda: ['Fabia', 'Octavia', 'Superb', 'Yeti', 'Kodiaq'],
  seat: ['Ibiza', 'Leon', 'Altea', 'Toledo', 'Arona', 'Ateca'],
  fiat: ['500', 'Bravo', 'Doblo', 'Ducato', 'Tipo'],
  jeep: ['Compass', 'Grand Cherokee', 'Patriot', 'Renegade'],
  suzuki: ['Grand Vitara', 'Jimny', 'Swift', 'SX4', 'Vitara'],
  mitsubishi: ['Pajero'],
  'alfa romeo': ['Mito'],
  subaru: ['Legacy'],
  volvo: ['C30', 'C70', 'S40', 'S60', 'V50', 'XC60'],
  isuzu: ['D-Max'],
  chevrolet: [],
  porsche: ['Cayenne']
};

// Car brands to look for in product names
const CAR_BRANDS = [
  'Alfa Romeo', 'Audi', 'BMW', 'Mercedes', 'Volkswagen', 'VW', 'Toyota',
  'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
  'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
  'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Land Rover',
  'Jaguar', 'Porsche', 'Mini', 'Smart', 'Suzuki', 'Isuzu', 'Infiniti',
  'Lexus', 'Acura', 'Genesis', 'DS', 'Cupra'
];

function extractBrandModelFromName(productName) {
  let cleanName = productName.replace(/^Navigatie\s+PilotOn\s+/i, '');

  let foundBrand = null;
  let brandPattern = null;

  for (const brand of CAR_BRANDS) {
    const pattern = new RegExp(`^${brand}\\s+`, 'i');
    if (pattern.test(cleanName)) {
      foundBrand = brand;
      brandPattern = pattern;
      break;
    }
  }

  if (!foundBrand) return null;

  // Normalize VW to Volkswagen
  if (foundBrand.toUpperCase() === 'VW') {
    foundBrand = 'Volkswagen';
  }

  cleanName = cleanName.replace(brandPattern, '');

  // Extract model and years
  const yearPatterns = [
    /^(.+?)\s+(\d{4}-\d{4})\s+/,
    /^(.+?)\s+(dupa\s+\d{4})\s+/,
    /^(.+?)\s+(pana\s+\d{4})\s+/,
    /^(.+?)\s+(\d{4}-prezent)\s+/,
    /^(.+?)\s+(\(\d{4}-\d{4}\))\s+/,
    /^(.+?)\s+(\d{4})\s+/,
  ];

  let model = null;
  let years = null;

  for (const pattern of yearPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      model = match[1].trim();
      years = match[2].trim();
      break;
    }
  }

  if (!model) {
    const specPatterns = [
      /^(.+?)\s+\d+\s*inch\s+/i,
      /^(.+?)\s+\d+GB\s+/i,
      /^(.+?)\s+\d+K\s+/i,
      /^(.+?)\s+\d+\s+CORE\s*/i
    ];

    for (const pattern of specPatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        model = match[1].trim();
        break;
      }
    }
  }

  return {
    brand: foundBrand,
    model: model || 'Unknown',
    years: years
  };
}

async function verifyBrandsAndModels() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB\n');

    const products = await Product.find({}, 'name').lean();
    console.log(`Found ${products.length} products in database\n`);

    const brandModelMap = new Map();
    const missingBrands = new Set();
    const missingModels = [];

    for (const product of products) {
      const extracted = extractBrandModelFromName(product.name);
      if (!extracted) continue;

      const brandKey = extracted.brand.toLowerCase();

      if (!brandModelMap.has(brandKey)) {
        brandModelMap.set(brandKey, {
          brand: extracted.brand,
          models: new Set()
        });
      }

      brandModelMap.get(brandKey).models.add(extracted.model);

      // Check if brand is on homepage
      const homepageBrandMatch = HOMEPAGE_BRANDS.find(
        b => b.toLowerCase() === extracted.brand.toLowerCase()
      );
      if (!homepageBrandMatch) {
        missingBrands.add(extracted.brand);
      }
    }

    // Check for missing models in fallback list
    for (const [brandKey, brandData] of brandModelMap) {
      const fallbackModels = FALLBACK_BRAND_MODELS[brandKey] || [];

      for (const model of brandData.models) {
        if (model === 'Unknown') continue;

        // Extract base model name (without generation numbers)
        const baseModel = model.replace(/\s+\d+\s*$/, '').trim();

        const modelInFallback = fallbackModels.some(fm =>
          fm.toLowerCase() === baseModel.toLowerCase() ||
          baseModel.toLowerCase().includes(fm.toLowerCase()) ||
          fm.toLowerCase().includes(baseModel.toLowerCase())
        );

        if (!modelInFallback && !FALLBACK_BRAND_MODELS[brandKey]) {
          missingModels.push({
            brand: brandData.brand,
            model: model,
            baseModel: baseModel
          });
        }
      }
    }

    // Report results
    console.log('=' .repeat(60));
    console.log('BRANDS AND MODELS VERIFICATION REPORT');
    console.log('=' .repeat(60));

    console.log('\n📦 BRANDS FOUND IN DATABASE:');
    console.log('-'.repeat(40));
    for (const [brandKey, brandData] of [...brandModelMap].sort((a, b) => a[0].localeCompare(b[0]))) {
      const onHomepage = HOMEPAGE_BRANDS.some(b => b.toLowerCase() === brandKey);
      const status = onHomepage ? '✅' : '❌ NOT ON HOMEPAGE';
      console.log(`  ${brandData.brand}: ${brandData.models.size} models ${status}`);
    }

    if (missingBrands.size > 0) {
      console.log('\n⚠️  BRANDS WITH PRODUCTS BUT NOT ON HOMEPAGE:');
      console.log('-'.repeat(40));
      for (const brand of missingBrands) {
        console.log(`  ❌ ${brand}`);
      }
      console.log('\nAdd these to HomePage.jsx brands array!');
    } else {
      console.log('\n✅ All brands with products are on the homepage!');
    }

    console.log('\n📋 MODELS BY BRAND (from product names):');
    console.log('-'.repeat(40));
    for (const [brandKey, brandData] of [...brandModelMap].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`\n  ${brandData.brand}:`);
      const sortedModels = [...brandData.models].sort();
      for (const model of sortedModels) {
        const hasFallback = FALLBACK_BRAND_MODELS[brandKey];
        if (!hasFallback) {
          console.log(`    - ${model} ⚠️  (no fallback defined for this brand)`);
        } else {
          console.log(`    - ${model}`);
        }
      }
    }

    // Check for brands in fallback that have no products
    console.log('\n📊 BRANDS IN FALLBACK WITHOUT PRODUCTS:');
    console.log('-'.repeat(40));
    for (const brandKey of Object.keys(FALLBACK_BRAND_MODELS)) {
      if (!brandModelMap.has(brandKey)) {
        console.log(`  ⚠️  ${brandKey} (defined in fallback but no products)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('END OF REPORT');
    console.log('='.repeat(60));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyBrandsAndModels();
