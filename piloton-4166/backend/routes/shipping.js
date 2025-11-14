const express = require('express');
const fanCourierService = require('../services/fanCourierService');
const auth = require('../middleware/auth');
const router = express.Router();

// Get shipping quote for a destination
router.post('/quote', async (req, res) => {
  try {
    const { city, county, weight } = req.body;

    if (!city || !county) {
      return res.status(400).json({ 
        message: 'City and county are required for shipping quote' 
      });
    }

    // For now, return mock data since getting services requires complex API integration
    const mockServices = [
      {
        name: 'Standard',
        price: 25.00,
        estimatedDays: city.toLowerCase().includes('bucuresti') ? 1 : 2,
        description: 'Livrare standard 1-2 zile lucratoare'
      }
    ];

    // Add express option for major cities
    const majorCities = ['bucuresti', 'cluj', 'timisoara', 'iasi', 'constanta'];
    if (majorCities.some(majorCity => city.toLowerCase().includes(majorCity))) {
      mockServices.push({
        name: 'Express',
        price: 35.00,
        estimatedDays: 1,
        description: 'Livrare express în aceeași zi'
      });
    }

    res.json({
      success: true,
      services: mockServices,
      estimatedDelivery: calculateEstimatedDelivery(city, county)
    });

  } catch (error) {
    console.error('Error getting shipping quote:', error);
    res.status(500).json({ 
      message: 'Error getting shipping quote', 
      error: error.message 
    });
  }
});

// Track shipment by AWB number (public endpoint)
router.get('/track/:awbNumber', async (req, res) => {
  try {
    const { awbNumber } = req.params;

    if (!awbNumber) {
      return res.status(400).json({ message: 'AWB number is required' });
    }

    const trackingResult = await fanCourierService.trackOrder(awbNumber);

    if (trackingResult.success) {
      res.json({
        success: true,
        awbNumber: awbNumber,
        status: trackingResult.status,
        statusDescription: trackingResult.statusDescription,
        history: trackingResult.history,
        deliveryDate: trackingResult.deliveryDate,
        recipientName: trackingResult.recipientName
      });
    } else {
      res.status(404).json({
        message: 'Tracking information not found',
        error: trackingResult.error
      });
    }
  } catch (error) {
    console.error('Error tracking shipment:', error);
    res.status(500).json({ 
      message: 'Error tracking shipment', 
      error: error.message 
    });
  }
});

// Get available services for a route
router.get('/services', async (req, res) => {
  try {
    const { from, to, weight } = req.query;

    // Use default origin if not specified
    const originCity = from || process.env.FAN_COURIER_ORIGIN_CITY || 'Bucuresti';

    if (!to) {
      return res.status(400).json({ 
        message: 'Destination city is required' 
      });
    }

    const authResult = await fanCourierService.authenticate();
    if (!authResult.success) {
      return res.status(500).json({
        message: 'Shipping service temporarily unavailable',
        error: authResult.error
      });
    }

    const servicesResult = await fanCourierService.getServices(
      originCity,
      to,
      parseFloat(weight) || 1,
      authResult.token
    );

    if (servicesResult.success) {
      res.json({
        success: true,
        from: originCity,
        to: to,
        weight: parseFloat(weight) || 1,
        services: servicesResult.services
      });
    } else {
      res.status(500).json({
        message: 'Failed to get available services',
        error: servicesResult.error
      });
    }
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ 
      message: 'Error getting services', 
      error: error.message 
    });
  }
});

// Admin endpoint to cancel AWB (requires admin auth in production)
router.delete('/awb/:awbNumber', auth, async (req, res) => {
  try {
    const { awbNumber } = req.params;

    if (!awbNumber) {
      return res.status(400).json({ message: 'AWB number is required' });
    }

    const authResult = await fanCourierService.authenticate();
    if (!authResult.success) {
      return res.status(500).json({
        message: 'Shipping service temporarily unavailable',
        error: authResult.error
      });
    }

    const cancelResult = await fanCourierService.cancelAWB(awbNumber, authResult.token);

    if (cancelResult.success) {
      res.json({
        success: true,
        message: 'AWB cancelled successfully',
        awbNumber: awbNumber
      });
    } else {
      res.status(500).json({
        message: 'Failed to cancel AWB',
        error: cancelResult.error
      });
    }
  } catch (error) {
    console.error('Error cancelling AWB:', error);
    res.status(500).json({ 
      message: 'Error cancelling AWB', 
      error: error.message 
    });
  }
});

// Helper function to calculate estimated delivery
function calculateEstimatedDelivery(city, county) {
  // Basic estimation logic - can be enhanced based on FAN Courier data
  const majorCities = ['Bucuresti', 'Cluj-Napoca', 'Timisoara', 'Iasi', 'Constanta'];
  const isMajorCity = majorCities.some(majorCity => 
    city.toLowerCase().includes(majorCity.toLowerCase())
  );

  const baseDeliveryDays = isMajorCity ? 1 : 2;
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + baseDeliveryDays);
  
  return estimatedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

module.exports = router;