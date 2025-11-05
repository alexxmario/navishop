import connectDB from '../../../lib/mongodb';
import Product from '../../../lib/models/Product';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    await connectDB();

    const { brand, model } = req.query;

    // Try to find real products first
    const products = await Product.find({
      brand: new RegExp(brand, 'i'),
      status: 'active'
    })
    .select('name price originalPrice images slug category description structuredDescription averageRating totalReviews stock')
    .lean();

    // ULTRA PRECISE MODEL MATCHING - ALL model parts must match
    const modelProducts = products.filter(product => {
      const productName = product.name.toLowerCase();
      const brandLower = brand.toLowerCase();
      const modelLower = model.toLowerCase();

      // Check if product contains brand
      const hasBrand = productName.includes(brandLower) ||
                      productName.includes(brandLower.replace(/\s+/g, ''));

      if (!hasBrand) return false;

      // Split model into individual parts (words/tokens)
      const modelParts = cleanModelName(modelLower)
        .split(/[\s\-_]+/)
        .filter(part => part.length > 0);

      // ALL model parts must be found in the product name
      const allPartsMatch = modelParts.every(part => {
        // For each part, create exact word boundary patterns
        const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [
          new RegExp(`\\b${escapedPart}\\b`, 'i'),
          new RegExp(`\\b${escapedPart.replace(/\s+/g, '')}\\b`, 'i'),
          new RegExp(`\\b${escapedPart.replace(/\s+/g, '-')}\\b`, 'i'),
          new RegExp(`\\b${escapedPart.replace(/\s+/g, '_')}\\b`, 'i')
        ];

        return patterns.some(pattern => pattern.test(productName));
      });

      // For complex models like "X3 E83", require the full model sequence
      if (modelParts.length >= 2) {
        const fullModelPattern = modelParts
          .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('\\s*');
        const fullModelRegex = new RegExp(`\\b${fullModelPattern}\\b`, 'i');

        // Either all parts match individually OR the full sequence matches
        return allPartsMatch || fullModelRegex.test(productName);
      }

      return allPartsMatch;
    });

    function cleanModelName(model) {
      return model
        .replace(/[()]/g, '') // Remove parentheses
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    }

    function generateModelVariations(model) {
      const variations = [model];

      // Add variations with different separators
      variations.push(model.replace(/\s+/g, ''));
      variations.push(model.replace(/\s+/g, '-'));
      variations.push(model.replace(/\s+/g, '_'));

      // For models with Roman numerals
      const romanMap = {'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5'};
      Object.keys(romanMap).forEach(roman => {
        if (model.includes(roman)) {
          variations.push(model.replace(roman, romanMap[roman]));
        }
      });

      // For models with numbers, add variations
      if (model.match(/\d+/)) {
        // Add version without numbers
        variations.push(model.replace(/\s*\d+.*/, ''));
        // Add just the base model name
        const baseModel = model.split(/\s+/)[0];
        variations.push(baseModel);
      }

      return [...new Set(variations)]; // Remove duplicates
    }

    // Debug logging
    console.log(`Searching for brand: "${brand}", model: "${model}"`);
    console.log(`Found ${products.length} total products for brand "${brand}"`);
    console.log(`Found ${modelProducts.length} products matching model "${model}"`);

    if (products.length > 0) {
      console.log('Sample product names:');
      products.slice(0, 3).forEach(p => console.log(`- "${p.name}"`));
    }

    let responseProducts = [];

    if (modelProducts.length > 0) {
      // Use real products if found
      responseProducts = modelProducts;
      console.log(`Using ${responseProducts.length} real products`);
    } else {
      // Generate mock products for this specific model
      responseProducts = generateMockProducts(brand, model);
      console.log(`Generated ${responseProducts.length} mock products`);
    }

    const modelData = {
      brand: brand,
      model: model,
      description: `Navigation systems compatible with ${brand} ${model}`,
      products: responseProducts,
      totalProducts: responseProducts.length,
      specifications: {
        compatibility: `${brand} ${model}`,
        installation: 'Professional installation recommended',
        warranty: '2 years'
      }
    };

    res.status(200).json({
      success: true,
      data: modelData
    });

  } catch (error) {
    console.error('Model API error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching model data',
      error: error.message
    });
  }
}

function generateMockProducts(brand, model) {
  // Generate 3-8 mock products for this specific brand/model
  const productCount = Math.floor(Math.random() * 6) + 3;
  const products = [];

  const productTypes = [
    'Navigație GPS Premium',
    'Sistem multimedia Android',
    'CarPlay Android Auto',
    'Navigație cu cameră marsarier',
    'Sistem audio premium',
    'Display multimedia touchscreen',
    'Navigație GPS portabil',
    'Sistem infotainment'
  ];

  for (let i = 0; i < productCount; i++) {
    const productType = productTypes[i % productTypes.length];
    const basePrice = Math.floor(Math.random() * 1000) + 299;
    const originalPrice = basePrice + Math.floor(Math.random() * 300) + 100;

    products.push({
      _id: `mock-${brand}-${model}-${i}`,
      name: `${productType} ${brand} ${model}`,
      slug: `${productType.toLowerCase().replace(/\s+/g, '-')}-${brand.toLowerCase()}-${model.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      price: basePrice,
      originalPrice: originalPrice,
      category: 'navigatii-gps',
      description: `Sistem de navigație de înaltă calitate, compatibil cu ${brand} ${model}. Include hărți actualizate, interfață intuitivă și funcții premium.`,
      images: [
        {
          url: `https://placehold.co/400x300/1f2937/ffffff?text=${encodeURIComponent(productType)}`,
          alt: `${productType} ${brand} ${model}`
        }
      ],
      averageRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      totalReviews: Math.floor(Math.random() * 50) + 5,
      stock: Math.floor(Math.random() * 20) + 1,
      featured: Math.random() > 0.7 // 30% chance of being featured
    });
  }

  return products;
}