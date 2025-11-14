const express = require('express');
const fanCourierService = require('../services/fanCourierService');
const router = express.Router();

// Test endpoint for FAN Courier API
router.get('/test-fan-courier', async (req, res) => {
  try {
    const result = {
      timestamp: new Date().toISOString(),
      environment: {
        hasClientId: !!process.env.FAN_COURIER_CLIENT_ID,
        hasUsername: !!process.env.FAN_COURIER_USERNAME,
        hasPassword: !!process.env.FAN_COURIER_PASSWORD,
        baseURL: 'https://www.selfawb.ro'
      },
      test: 'authentication'
    };

    // Test authentication
    const authResult = await fanCourierService.authenticate();
    result.authResult = authResult;

    // Add troubleshooting info
    result.troubleshooting = {
      suggestions: [
        'Verify credentials at https://www.selfawb.ro',
        'Check if API access is enabled for your account',
        'Ensure client_id matches your account settings',
        'Contact FAN Courier support if issues persist'
      ],
      nextSteps: authResult.success ? [
        'Authentication successful - you can now create shipments',
        'Test AWB creation with a real order',
        'Set up webhooks for status updates'
      ] : [
        'Fix authentication issues first',
        'Double-check credentials in .env file',
        'Test manual login at selfawb.ro'
      ]
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint to simulate shipping quote
router.post('/test-quote', async (req, res) => {
  const { city, county, weight } = req.body;
  
  // Simulate a quote response for testing UI
  const mockQuote = {
    success: true,
    city: city || 'Cluj-Napoca',
    county: county || 'Cluj',
    weight: weight || 1,
    services: [
      {
        name: 'Standard',
        price: 25.50,
        estimatedDays: 1,
        description: 'Livrare standard 1-2 zile lucratoare'
      },
      {
        name: 'Express',
        price: 35.00,
        estimatedDays: 1,
        description: 'Livrare express în aceeași zi'
      }
    ],
    estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    note: 'This is a mock response for testing. Real quotes require working FAN Courier API authentication.'
  };

  res.json(mockQuote);
});

// Test endpoint to simulate tracking
router.get('/test-track/:awbNumber', (req, res) => {
  const { awbNumber } = req.params;
  
  // Simulate tracking response for testing UI
  const mockTracking = {
    success: true,
    awbNumber: awbNumber,
    status: 'In livrare',
    statusDescription: 'Coletul este în curs de livrare către destinatar',
    history: [
      {
        date: '2024-01-13T08:00:00Z',
        status: 'Preluat',
        location: 'Bucuresti - Depozit Central',
        description: 'Coletul a fost preluat de la expeditor'
      },
      {
        date: '2024-01-13T14:30:00Z',
        status: 'In tranzit',
        location: 'Cluj-Napoca - Depozit',
        description: 'Coletul este în curs de transport'
      },
      {
        date: '2024-01-14T09:15:00Z',
        status: 'In livrare',
        location: 'Cluj-Napoca - Curier',
        description: 'Coletul este în curs de livrare'
      }
    ],
    deliveryDate: null,
    recipientName: 'Test Customer',
    note: 'This is a mock response for testing. Real tracking requires working FAN Courier API authentication.'
  };

  res.json(mockTracking);
});

module.exports = router;