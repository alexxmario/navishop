const express = require('express');
const router = express.Router();
const BrandModelExtractor = require('../services/brandModelExtractor');

// Get all brands with their models
router.get('/', async (req, res) => {
  try {
    const extractor = new BrandModelExtractor();
    const brandsWithModels = await extractor.getAllBrandsWithModels();
    
    // Convert to array and sort by brand name
    const brandsArray = Object.keys(brandsWithModels)
      .map(key => ({
        brandKey: key,
        ...brandsWithModels[key]
      }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
    
    res.json({
      success: true,
      data: brandsArray
    });
  } catch (error) {
    console.error('Error getting brands:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get brands',
      error: error.message
    });
  }
});

// Get models for a specific brand
router.get('/:brand', async (req, res) => {
  try {
    const { brand } = req.params;
    const extractor = new BrandModelExtractor();
    const brandsWithModels = await extractor.getAllBrandsWithModels();
    
    const brandKey = brand.toLowerCase();
    const brandData = brandsWithModels[brandKey];
    
    if (!brandData) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }
    
    // Convert models to array and sort
    const modelsArray = Object.keys(brandData.models)
      .map(key => ({
        modelKey: key,
        ...brandData.models[key]
      }))
      .sort((a, b) => a.model.localeCompare(b.model));
    
    res.json({
      success: true,
      data: {
        brand: brandData.brand,
        models: modelsArray
      }
    });
  } catch (error) {
    console.error('Error getting brand models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get brand models',
      error: error.message
    });
  }
});

// Get products for a specific brand and model
router.get('/:brand/:model', async (req, res) => {
  try {
    const { brand, model } = req.params;
    const { generation } = req.query;
    
    const extractor = new BrandModelExtractor();
    const products = await extractor.getProductsByBrandModel(brand, model, generation);
    
    res.json({
      success: true,
      data: {
        brand,
        model,
        totalProducts: products.length,
        products: products
      }
    });
  } catch (error) {
    console.error('Error getting brand model products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get brand model products',
      error: error.message
    });
  }
});

module.exports = router;