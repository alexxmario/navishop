require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const PRODUCTS_JSON_PATH = process.env.PRODUCTS_JSON_PATH || path.join(__dirname, '../../piloton.products.json');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const generateSlug = (name = '') => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const readProductsFromFile = (filePath = PRODUCTS_JSON_PATH) => {
  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    const fileContents = fs.readFileSync(absolutePath, 'utf-8');
    const data = JSON.parse(fileContents);
    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of products');
    }
    console.log(`📦 Loaded ${data.length} products from ${absolutePath}`);
    return data;
  } catch (error) {
    console.error('Failed to read products JSON file:', error.message);
    process.exit(1);
  }
};

const normalizeCompatibility = (compatibility, fallbackBrand, fallbackModel) => {
  if (Array.isArray(compatibility)) {
    return compatibility.map(item => ({
      brand: item.brand || fallbackBrand || 'PilotOn',
      model: item.model || '',
      models: Array.isArray(item.models) ? item.models : [],
      yearFrom: item.yearFrom,
      yearTo: item.yearTo,
      years: Array.isArray(item.years) ? item.years : []
    }));
  }

  if (compatibility && typeof compatibility === 'object') {
    return [{
      brand: compatibility.brand || fallbackBrand || 'PilotOn',
      model: compatibility.model || fallbackModel || '',
      models: Array.isArray(compatibility.models) ? compatibility.models : [],
      yearFrom: compatibility.yearFrom,
      yearTo: compatibility.yearTo,
      years: Array.isArray(compatibility.years) ? compatibility.years : []
    }];
  }

  if (fallbackBrand || fallbackModel) {
    return [{
      brand: fallbackBrand || 'PilotOn',
      model: fallbackModel || '',
      models: fallbackModel ? [fallbackModel] : [],
      years: []
    }];
  }

  return [];
};

const normalizeImages = (images = [], productName) => {
  if (!Array.isArray(images)) return [];
  return images
    .filter(img => img && img.url)
    .map(img => ({
      url: img.url,
      alt: img.alt || productName,
      isPrimary: Boolean(img.isPrimary)
    }));
};

const normalizeSpecifications = (specifications = []) => {
  if (!Array.isArray(specifications)) return [];
  return specifications
    .filter(spec => spec && spec.key && spec.value)
    .map(spec => ({
      key: spec.key,
      value: spec.value
    }));
};

const extractBrandFromName = (name = '') => {
  const match = name.match(/^Navigatie\s+PilotOn\s+([A-Za-zăîâșțüöé\- ]+)/i);
  if (match && match[1]) {
    return match[1].trim().split(' ')[0];
  }
  return 'PilotOn';
};

const normalizeProduct = (rawProduct) => {
  const name = rawProduct.name || 'Navigatie PilotOn';
  const slug = rawProduct.slug || generateSlug(name);
  const sku = rawProduct.sku || rawProduct.romanianSpecs?.general?.sku || `SKU-${slug}`;
  const fallbackBrand = rawProduct.brand || rawProduct.romanianSpecs?.general?.brand || extractBrandFromName(name);
  const fallbackModel = rawProduct.model || rawProduct.romanianSpecs?.general?.categorii || '';

  return {
    name,
    slug,
    description: rawProduct.description || '',
    shortDescription: rawProduct.shortDescription || '',
    category: rawProduct.category || 'navigatii-gps',
    subcategory: rawProduct.subcategory || '',
    brand: fallbackBrand,
    model: fallbackModel,
    sku,
    price: typeof rawProduct.price === 'number' ? rawProduct.price : Number(rawProduct.price) || 0,
    originalPrice: typeof rawProduct.originalPrice === 'number'
      ? rawProduct.originalPrice
      : Number(rawProduct.originalPrice) || undefined,
    discount: typeof rawProduct.discount === 'number' ? rawProduct.discount : 0,
    stock: typeof rawProduct.stock === 'number' ? rawProduct.stock : 0,
    lowStockThreshold: rawProduct.lowStockThreshold ?? 5,
    images: normalizeImages(rawProduct.images, name),
    specifications: normalizeSpecifications(rawProduct.specifications),
    compatibility: normalizeCompatibility(rawProduct.compatibility, fallbackBrand, fallbackModel),
    features: Array.isArray(rawProduct.features) ? rawProduct.features : [],
    inTheBox: Array.isArray(rawProduct.inTheBox) ? rawProduct.inTheBox : [],
    detailedSpecs: rawProduct.detailedSpecs || {},
    displaySpecs: rawProduct.displaySpecs || {},
    structuredDescription: rawProduct.structuredDescription || { sections: [] },
    romanianSpecs: rawProduct.romanianSpecs || {},
    warranty: rawProduct.warranty || 12,
    status: rawProduct.status || 'active',
    featured: Boolean(rawProduct.featured),
    newProduct: Boolean(rawProduct.newProduct),
    averageRating: rawProduct.averageRating || 0,
    totalReviews: rawProduct.totalReviews || 0,
    viewCount: rawProduct.viewCount || 0
  };
};

const seedProducts = async () => {
  try {
    const rawProducts = readProductsFromFile();
    const normalizedProducts = rawProducts.map(normalizeProduct);

    console.log('🧹 Clearing existing products...');
    await Product.deleteMany({});
    
    console.log('🌱 Seeding products from JSON...');
    await Product.insertMany(normalizedProducts, { ordered: false });
    
    console.log(`✅ Successfully seeded ${normalizedProducts.length} products.`);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

const runSeed = async () => {
  await connectDB();
  await seedProducts();
  await mongoose.connection.close();
  console.log('🏁 Seeding completed and database connection closed.');
};

if (require.main === module) {
  runSeed();
}

module.exports = { seedProducts, normalizeProduct };
