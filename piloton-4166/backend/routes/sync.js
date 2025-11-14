const express = require('express');
const router = express.Router();
const FeedParser = require('../services/feedParser');

// Sync products from external feed
router.post('/products', async (req, res) => {
  try {
    const feedParser = new FeedParser();
    const result = await feedParser.syncProducts();
    
    res.json({
      success: true,
      message: 'Product sync completed',
      data: result
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync products',
      error: error.message
    });
  }
});

// Get sync status (optional endpoint for monitoring)
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Sync service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;