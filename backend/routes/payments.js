const express = require('express');
const Order = require('../models/Order');
const GuestOrder = require('../models/GuestOrder');
const euplatescService = require('../services/euplatescService');

const router = express.Router();

router.post('/euplatesc/callback', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const payload = req.body;
    console.log('EuPlatesc callback payload:', payload);

    if (!euplatescService.verifySignature(payload)) {
      console.warn('EuPlatesc callback signature mismatch');
      return res.status(400).send('INVALID_FP');
    }

    const { invoice_id, action, rrn, approval, amount } = payload;

    if (!invoice_id) {
      return res.status(400).send('MISSING_INVOICE');
    }

    let order = await Order.findOne({ orderNumber: invoice_id });
    let isGuestOrder = false;

    if (!order) {
      order = await GuestOrder.findOne({ orderNumber: invoice_id });
      isGuestOrder = true;
    }

    if (!order) {
      console.error('Order not found for EuPlatesc invoice_id:', invoice_id);
      return res.status(404).send('ORDER_NOT_FOUND');
    }

    const success = action === '0';
    order.paymentStatus = success ? 'completed' : 'failed';
    order.status = success ? 'confirmed' : 'cancelled';
    order.paymentReference = {
      rrn,
      approval,
      amount
    };

    await order.save();

    console.log(`${isGuestOrder ? 'Guest' : 'User'} order ${order.orderNumber} updated via EuPlatesc callback. Success: ${success}`);

    return res.send('OK');
  } catch (error) {
    console.error('Error processing EuPlatesc callback:', error);
    return res.status(500).send('ERROR');
  }
});

module.exports = router;
