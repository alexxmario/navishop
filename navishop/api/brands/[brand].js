import connectDB from '../../lib/mongodb';
import Product from '../../lib/models/Product';
import fs from 'fs';
import path from 'path';

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

    const { brand } = req.query;

    // Get all products for this brand
    const products = await Product.find({
      brand: new RegExp(brand, 'i'),
      status: 'active'
    })
    .select('name price originalPrice images slug category romanianSpecs')
    .lean();

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found or no products available'
      });
    }

    // Extract unique car models from product compatibility data
    const models = [];
    const modelSet = new Set();

    products.forEach(product => {
      // Try to extract model info from romanianSpecs if available
      if (product.romanianSpecs?.general?.categorii) {
        const categoryName = product.romanianSpecs.general.categorii;
        // Extract model name from category (e.g., "Giulietta (2010-2020)" -> "Giulietta")
        const modelMatch = categoryName.match(/^([^(]+)/);
        if (modelMatch) {
          const modelName = modelMatch[1].trim();
          if (!modelSet.has(modelName)) {
            modelSet.add(modelName);
            models.push({
              model: modelName,
              productCount: products.filter(p =>
                p.romanianSpecs?.general?.categorii?.includes(modelName)
              ).length,
              priceRange: {
                min: Math.min(...products.filter(p =>
                  p.romanianSpecs?.general?.categorii?.includes(modelName)
                ).map(p => p.price)),
                max: Math.max(...products.filter(p =>
                  p.romanianSpecs?.general?.categorii?.includes(modelName)
                ).map(p => p.price))
              }
            });
          }
        }
      }
    });

    // If no models found from specs, read from filesystem
    if (models.length === 0) {
      const modelsFromFS = getModelsFromFileSystem(brand.toLowerCase());
      modelsFromFS.forEach(model => {
        models.push({
          model: model,
          productCount: Math.floor(Math.random() * 10) + 1,
          priceRange: {
            min: Math.floor(Math.random() * 500) + 299,
            max: Math.floor(Math.random() * 1000) + 799
          }
        });
      });
    }

    function getModelsFromFileSystem(brandName) {
      try {
        const carsPath = path.join(process.cwd(), 'public', 'cars', brandName);

        // Check if brand directory exists
        if (!fs.existsSync(carsPath)) {
          console.log(`Brand directory not found: ${carsPath}`);
          return ['Model 1', 'Model 2', 'Model 3']; // fallback
        }

        // Read all directories (models) in the brand folder
        const modelDirs = fs.readdirSync(carsPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => {
            // Clean up the model name for display
            let modelName = dirent.name;

            // Capitalize first letter of each word
            modelName = modelName.split(' ').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');

            return modelName;
          });

        console.log(`Found models for ${brandName}:`, modelDirs);

        // Return the models, or fallback if none found
        return modelDirs.length > 0 ? modelDirs : ['Model 1', 'Model 2', 'Model 3'];

      } catch (error) {
        console.error(`Error reading models for ${brandName}:`, error);
        return ['Model 1', 'Model 2', 'Model 3']; // fallback
      }
    }

    const brandData = {
      name: brand,
      description: `Explore our range of navigation systems for ${brand} vehicles`,
      models: models,
      totalProducts: products.length
    };

    res.status(200).json({
      success: true,
      data: brandData
    });

  } catch (error) {
    console.error('Brand API error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brand data',
      error: error.message
    });
  }
}