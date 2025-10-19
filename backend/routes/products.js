const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured,
      onSale,
      inStock,
      lowStock
    } = req.query;

    const query = { status: 'active' };
    
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (brand) query.brand = new RegExp(brand, 'i');
    if (featured !== undefined) query.featured = featured === 'true';
    if (onSale !== undefined) query.onSale = onSale === 'true';
    if (inStock !== undefined && inStock === 'true') query.stock = { $gt: 0 };
    if (lowStock !== undefined && lowStock === 'true') {
      query.$expr = { 
        $and: [
          { $gt: ['$stock', 0] },
          { $lte: ['$stock', '$lowStockThreshold'] }
        ]
      };
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    let products, total;
    
    if (search) {
      // Implement strict search for precise model matching
      const searchTerms = search.toLowerCase().trim().split(/\s+/);
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Brand aliases mapping
      const brandAliases = {
        'volkswagen': ['vw', 'volkswagen'],
        'vw': ['vw', 'volkswagen'], 
        'bmw': ['bmw'],
        'mercedes': ['mercedes', 'mercedes-benz'],
        'audi': ['audi'],
        'ford': ['ford'],
        'opel': ['opel'],
        'peugeot': ['peugeot'],
        'renault': ['renault'],
        'hyundai': ['hyundai'],
        'kia': ['kia'],
        'toyota': ['toyota'],
        'honda': ['honda'],
        'nissan': ['nissan']
      };
      
      if (searchTerms.length >= 2) {
        // Multi-term search: treat first term as brand, rest as model and potentially year
        const brand = searchTerms[0];
        const remainingTerms = searchTerms.slice(1);
        
        // Check if last term is a year (4 digits between 1990-2030)
        const lastTerm = remainingTerms[remainingTerms.length - 1];
        const isYear = /^\d{4}$/.test(lastTerm) && parseInt(lastTerm) >= 1990 && parseInt(lastTerm) <= 2030;
        
        let model, searchYear;
        if (isYear) {
          searchYear = parseInt(lastTerm);
          model = remainingTerms.slice(0, -1).join(' ');
        } else {
          model = remainingTerms.join(' ');
          searchYear = null;
        }
        
        // Get brand variations
        const brandVariations = brandAliases[brand] || [brand];
        
        // For brand+model search, look for exact model matches in product name
        let searchQuery = {
          ...query,
          $and: [
            // Product name must contain one of the brand variations (case insensitive)
            { name: new RegExp(brandVariations.join('|'), 'i') },
            // Product name must contain the model with word boundaries
            { name: new RegExp(`\\b${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') }
          ]
        };
        
        // Execute the search first
        let searchProducts = await Product.find(searchQuery)
          .sort({ createdAt: -1 })
          .lean();
        
        // If year is specified, filter results to match year ranges
        if (searchYear) {
          searchProducts = searchProducts.filter(product => {
            // Extract year range from product name (YYYY-YYYY)
            const yearRangeMatch = product.name.match(/\b(\d{4})-(\d{4})\b/);
            if (yearRangeMatch) {
              const startYear = parseInt(yearRangeMatch[1]);
              const endYear = parseInt(yearRangeMatch[2]);
              return searchYear >= startYear && searchYear <= endYear;
            }
            
            // Check for "dupa YYYY" pattern (from YYYY onwards)
            const dupaYearMatch = product.name.match(/\bdupa (\d{4})\b/);
            if (dupaYearMatch) {
              const startYear = parseInt(dupaYearMatch[1]);
              return searchYear >= startYear;
            }
            
            // Check for single year match
            const singleYearMatch = product.name.match(/\b(\d{4})\b/);
            if (singleYearMatch) {
              return parseInt(singleYearMatch[1]) === searchYear;
            }
            
            return false;
          });
        }
        
        // Apply pagination to filtered results
        const total = searchProducts.length;
        products = searchProducts.slice(skip, skip + parseInt(limit));
      } else {
        // Single term search: use simple name or brand matching with aliases
        const term = searchTerms[0];
        const brandVariations = brandAliases[term] || [term];
        
        const searchQuery = {
          ...query,
          $or: [
            { brand: new RegExp(brandVariations.join('|'), 'i') },
            { name: new RegExp(brandVariations.join('|'), 'i') }
          ]
        };
        
        [products, total] = await Promise.all([
          Product.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
          Product.countDocuments(searchQuery)
        ]);
      }
      
    } else {
      // Non-search query - use original logic
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      [products, total] = await Promise.all([
        Product.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Product.countDocuments(query)
      ]);
    }

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        categories: await Product.distinct('category', { status: 'active' }),
        brands: await Product.distinct('brand', { status: 'active' }),
        priceRange: await Product.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
        ])
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ 
      status: 'active', 
      featured: true 
    })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching featured products', error: error.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { status: 'active' } },
      { 
        $group: { 
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' }
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

router.get('/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const suggestions = await Product.find({
      status: 'active',
      $or: [
        { name: new RegExp(q, 'i') },
        { brand: new RegExp(q, 'i') },
        { tags: new RegExp(q, 'i') }
      ]
    })
    .select('name brand category slug')
    .limit(5)
    .lean();

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching search suggestions', error: error.message });
  }
});

// Get cross-sell products for a product (bidirectional)
router.get('/:id/cross-sell', async (req, res) => {
  try {
    const productId = req.params.id;

    // Get the main product with its direct cross-sell products
    const product = await Product.findById(productId)
      .populate({
        path: 'crossSellProducts',
        match: { status: 'active' },
        select: 'name price originalPrice discount images slug averageRating totalReviews stock category',
        options: { lean: true }
      });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find products that have this product as their cross-sell (reverse relationships)
    const reverseProducts = await Product.find({
      crossSellProducts: productId,
      status: 'active',
      _id: { $ne: productId } // Exclude self
    })
    .select('name price originalPrice discount images slug averageRating totalReviews stock category')
    .lean();

    // Combine direct cross-sells and reverse cross-sells
    const directCrossSells = product.crossSellProducts || [];
    const reverseCrossSells = reverseProducts || [];

    // Remove duplicates (in case a product is both direct and reverse cross-sell)
    const allCrossSells = [...directCrossSells];
    reverseCrossSells.forEach(reverseProduct => {
      if (!allCrossSells.some(direct => direct._id.toString() === reverseProduct._id.toString())) {
        allCrossSells.push(reverseProduct);
      }
    });

    res.json({
      crossSellProducts: allCrossSells,
      directCrossSells: directCrossSells.length,
      reverseCrossSells: reverseCrossSells.length,
      totalCrossSells: allCrossSells.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cross-sell products', error: error.message });
  }
});

// Get product by ID (for admin panel)
router.get('/id/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('reviews.userId', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ 
      slug: req.params.slug, 
      status: 'active' 
    }).populate('reviews.userId', 'name');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.viewCount += 1;
    await product.save();

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: 'active'
    })
    .limit(4)
    .select('name price originalPrice images slug averageRating')
    .lean();

    res.json({
      product,
      relatedProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating product', error: error.message });
  }
});

router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const existingReviewIndex = product.reviews.findIndex(
      review => review.userId.toString() === req.user._id.toString()
    );

    if (existingReviewIndex > -1) {
      product.reviews[existingReviewIndex].rating = rating;
      product.reviews[existingReviewIndex].comment = comment;
    } else {
      product.reviews.push({
        userId: req.user._id,
        userName: req.user.name,
        rating,
        comment
      });
    }

    await product.save();
    
    await product.populate('reviews.userId', 'name');
    
    res.json(product.reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const product = await Product.findById(req.params.id)
      .populate('reviews.userId', 'name')
      .lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reviews = product.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + parseInt(limit));

    const totalReviews = product.reviews.length;
    const totalPages = Math.ceil(totalReviews / parseInt(limit));

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalReviews,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      averageRating: product.averageRating
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

module.exports = router;