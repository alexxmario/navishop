const express = require('express');
const fanCourierService = require('../services/fanCourierService');
const router = express.Router();

// Complete FAN Courier integration test
router.post('/complete-test', async (req, res) => {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      steps: []
    };

    // Step 1: Authentication
    testResults.steps.push({ step: 1, name: 'Authentication', status: 'running' });
    const authResult = await fanCourierService.authenticate();
    
    if (!authResult.success) {
      testResults.steps[0].status = 'failed';
      testResults.steps[0].error = authResult.error;
      return res.status(500).json(testResults);
    }
    
    testResults.steps[0].status = 'success';
    testResults.steps[0].token = authResult.token.substring(0, 20) + '...';

    // Step 2: AWB Creation
    testResults.steps.push({ step: 2, name: 'AWB Creation', status: 'running' });
    
    const testOrder = {
      orderNumber: `TEST${Date.now()}`,
      recipientName: req.body.recipientName || 'Test Customer',
      recipientPhone: req.body.recipientPhone || '0700000000',
      recipientEmail: req.body.recipientEmail || 'test@example.com',
      city: req.body.city || 'Bucuresti',
      county: req.body.county || 'Bucuresti',
      street: req.body.street || 'Calea Victoriei',
      streetNumber: req.body.streetNumber || '1',
      postalCode: req.body.postalCode || '010061',
      weight: req.body.weight || 1,
      declaredValue: req.body.declaredValue || 100,
      cashOnDelivery: req.body.cashOnDelivery || 0,
      contents: req.body.contents || 'Test package'
    };

    const awbResult = await fanCourierService.createAWB(testOrder, authResult.token);
    
    if (!awbResult.success) {
      testResults.steps[1].status = 'failed';
      testResults.steps[1].error = awbResult.error;
      return res.status(500).json(testResults);
    }
    
    testResults.steps[1].status = 'success';
    testResults.steps[1].awbNumber = awbResult.awbNumber;
    testResults.steps[1].cost = awbResult.cost;
    testResults.steps[1].totalCost = awbResult.totalCost;
    testResults.steps[1].office = awbResult.office;
    testResults.steps[1].estimatedDeliveryTime = awbResult.estimatedDeliveryTime;

    // Step 3: Tracking
    testResults.steps.push({ step: 3, name: 'Tracking', status: 'running' });
    
    const trackingResult = await fanCourierService.trackShipment(awbResult.awbNumber, authResult.token);
    
    if (!trackingResult.success) {
      testResults.steps[2].status = 'failed';
      testResults.steps[2].error = trackingResult.error;
    } else {
      testResults.steps[2].status = 'success';
      testResults.steps[2].trackingStatus = trackingResult.status;
      testResults.steps[2].statusDescription = trackingResult.statusDescription;
    }

    // Final result
    testResults.overall = {
      success: testResults.steps.every(step => step.status === 'success'),
      message: testResults.steps.every(step => step.status === 'success') 
        ? 'All FAN Courier integration tests passed successfully!'
        : 'Some tests failed - check individual steps for details'
    };

    res.json(testResults);

  } catch (error) {
    console.error('FAN Courier integration test error:', error);
    res.status(500).json({
      error: 'Integration test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test AWB creation with custom data
router.post('/create-awb', async (req, res) => {
  try {
    // Authenticate
    const authResult = await fanCourierService.authenticate();
    if (!authResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Authentication failed',
        details: authResult.error
      });
    }

    // Create AWB with provided data
    const orderData = {
      orderNumber: req.body.orderNumber || `TEST${Date.now()}`,
      recipientName: req.body.recipientName,
      recipientPhone: req.body.recipientPhone,
      recipientEmail: req.body.recipientEmail || '',
      city: req.body.city,
      county: req.body.county,
      street: req.body.street,
      streetNumber: req.body.streetNumber || '1',
      postalCode: req.body.postalCode,
      weight: req.body.weight || 1,
      declaredValue: req.body.declaredValue || 0,
      cashOnDelivery: req.body.cashOnDelivery || 0,
      contents: req.body.contents || 'Package contents'
    };

    const awbResult = await fanCourierService.createAWB(orderData, authResult.token);
    
    if (awbResult.success) {
      res.json({
        success: true,
        message: 'AWB created successfully',
        awb: {
          number: awbResult.awbNumber,
          cost: awbResult.cost,
          vat: awbResult.vat,
          totalCost: awbResult.totalCost,
          office: awbResult.office,
          routingCode: awbResult.routingCode,
          estimatedDeliveryTime: awbResult.estimatedDeliveryTime
        },
        order: orderData
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'AWB creation failed',
        details: awbResult.error
      });
    }

  } catch (error) {
    console.error('AWB creation test error:', error);
    res.status(500).json({
      success: false,
      error: 'AWB creation test failed',
      message: error.message
    });
  }
});

// Test tracking with AWB number
router.get('/track/:awbNumber', async (req, res) => {
  try {
    const { awbNumber } = req.params;

    // Authenticate
    const authResult = await fanCourierService.authenticate();
    if (!authResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Authentication failed',
        details: authResult.error
      });
    }

    // Track shipment
    const trackingResult = await fanCourierService.trackShipment(awbNumber, authResult.token);
    
    if (trackingResult.success) {
      res.json({
        success: true,
        awbNumber: awbNumber,
        tracking: {
          status: trackingResult.status,
          statusDescription: trackingResult.statusDescription,
          history: trackingResult.history,
          deliveryDate: trackingResult.deliveryDate,
          recipientName: trackingResult.recipientName
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Tracking failed',
        details: trackingResult.error
      });
    }

  } catch (error) {
    console.error('Tracking test error:', error);
    res.status(500).json({
      success: false,
      error: 'Tracking test failed',
      message: error.message
    });
  }
});

module.exports = router;