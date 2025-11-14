const express = require('express');
const Order = require('../models/Order');
const GuestOrder = require('../models/GuestOrder');
const smartbillService = require('../services/smartbillServiceCorrect');
const router = express.Router();

// SmartBill payment webhook
router.post('/smartbill/payment', async (req, res) => {
  try {
    const { paymentId, status, invoiceNumber } = req.body;
    
    console.log('SmartBill payment webhook received:', { paymentId, status, invoiceNumber });

    if (!paymentId || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find order by payment ID
    let order = await Order.findOne({ paymentId });
    let isGuestOrder = false;
    
    if (!order) {
      order = await GuestOrder.findOne({ paymentId });
      isGuestOrder = true;
    }

    if (!order) {
      console.error('Order not found for payment ID:', paymentId);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update payment status
    order.paymentStatus = status;

    // Update order status based on payment status
    switch (status) {
      case 'completed':
        order.status = 'confirmed';
        break;
      case 'failed':
      case 'cancelled':
        order.status = 'cancelled';
        break;
      default:
        order.status = 'pending';
    }

    await order.save();

    console.log(`${isGuestOrder ? 'Guest' : 'User'} order ${order.orderNumber} payment status updated to: ${status}`);

    res.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Error processing SmartBill webhook:', error);
    res.status(500).json({ 
      message: 'Error processing webhook', 
      error: error.message 
    });
  }
});

// Get invoice PDF
router.get('/invoice/:orderId/pdf', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Find order
    let order = await Order.findById(orderId);
    let isGuestOrder = false;
    
    if (!order) {
      order = await GuestOrder.findById(orderId);
      isGuestOrder = true;
    }

    if (!order || !order.invoice?.invoiceId) {
      return res.status(404).json({ 
        message: 'Order or invoice not found' 
      });
    }

    // Get PDF from SmartBill
    const pdfResult = await smartbillService.getInvoicePDF(order.invoice.invoiceId);
    
    if (!pdfResult.success) {
      return res.status(500).json({ 
        message: 'Failed to retrieve invoice PDF', 
        error: pdfResult.error 
      });
    }

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${order.invoice.invoiceNumber}.pdf"`);
    res.send(pdfResult.pdf);

  } catch (error) {
    console.error('Error retrieving invoice PDF:', error);
    res.status(500).json({ 
      message: 'Error retrieving invoice PDF', 
      error: error.message 
    });
  }
});

// Test SmartBill connection
router.get('/smartbill/test', async (req, res) => {
  try {
    const result = await smartbillService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check payment status manually
router.get('/payment/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const statusResult = await smartbillService.checkPaymentStatus(paymentId);
    
    if (!statusResult.success) {
      return res.status(500).json({ 
        message: 'Failed to check payment status', 
        error: statusResult.error 
      });
    }

    res.json({
      paymentId,
      status: statusResult.status,
      data: statusResult.data
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ 
      message: 'Error checking payment status', 
      error: error.message 
    });
  }
});

module.exports = router;