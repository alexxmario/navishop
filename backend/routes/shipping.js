const express = require('express');
const fanCourierService = require('../services/fanCourierService');
const auth = require('../middleware/auth');
const router = express.Router();

const DEFAULT_FALLBACK_OPTION = {
  name: 'Standard',
  price: 25,
  estimatedDays: 2,
  description: 'Tarif estimativ FAN Courier', 
  service: 'standard'
};

const buildFallbackQuote = (city, county) => {
  const option = { ...DEFAULT_FALLBACK_OPTION };
  return {
    success: true,
    services: [option],
    quote: {
      ...option,
      cost: option.price,
      estimatedDelivery: calculateEstimatedDelivery(option.estimatedDays)
    },
    estimatedDelivery: calculateEstimatedDelivery(option.estimatedDays),
    message: 'Tarif estimativ folosit (nu s-au putut obține tarifele oficiale FAN Courier).'
  };
};

// Get shipping quote for a destination
router.post('/quote', async (req, res) => {
  try {
    const { city, county, weight } = req.body;

    if (!city || !county) {
      return res.status(400).json({ 
        message: 'City and county are required for shipping quote' 
      });
    }

    const authResult = await fanCourierService.authenticate();
    if (!authResult.success) {
      console.warn('FAN Courier auth failed for quote:', authResult.error);
      return res.json(buildFallbackQuote(city, county));
    }

    const originCity = process.env.FAN_COURIER_ORIGIN_CITY || 'Bucuresti';
    const servicesResult = await fanCourierService.getServices(
      originCity,
      city,
      parseFloat(weight) || 1,
      authResult.token
    );

    if (!servicesResult.success || !servicesResult.services || servicesResult.services.length === 0) {
      console.warn('FAN Courier returned no services:', servicesResult.error);
      return res.json(buildFallbackQuote(city, county));
    }

    const mappedServices = servicesResult.services.map(mapFanServiceToOption);
    const selected = mappedServices[0];

    res.json({
      success: true,
      services: mappedServices,
      quote: selected,
      estimatedDelivery: selected.estimatedDelivery
    });

  } catch (error) {
    console.error('Error getting shipping quote:', error);
    res.json(buildFallbackQuote(req.body?.city, req.body?.county));
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

function mapFanServiceToOption(service = {}) {
  const price = Number(service.total ?? service.tariff ?? service.price ?? service.cost ?? 0);
  const name = service.service || service.name || 'Standard';
  const estimatedDays = Number(service.deliveryDays ?? service.estimatedDays ?? service.eta ?? 2) || 2;

  return {
    name,
    service: service.code || name,
    price,
    cost: price,
    vat: Number(service.vat ?? service.tva ?? 0),
    currency: service.currency || 'RON',
    description: service.description || service.details || '',
    estimatedDays,
    estimatedDelivery: calculateEstimatedDelivery(estimatedDays)
  };
}

// Helper function to calculate estimated delivery date (YYYY-MM-DD)
function calculateEstimatedDelivery(days = 2) {
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + (Number(days) || 2));
  return estimatedDate.toISOString().split('T')[0];
}

module.exports = router;
