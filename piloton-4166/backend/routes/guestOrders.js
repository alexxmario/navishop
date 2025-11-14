const express = require('express');
const GuestOrder = require('../models/GuestOrder');
const Product = require('../models/Product');
const smartbillService = require('../services/smartbillServiceCorrect');
const router = express.Router();

// Create guest order
router.post('/', async (req, res) => {
  try {
    console.log('Guest order request received:', req.body);

    const {
      guestEmail,
      guestPhone,
      guestName,
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes
    } = req.body;

    // Validate required fields
    if (!guestEmail || !guestPhone || !guestName || !items || !shippingAddress) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, phone, name, items, and shipping address are required' 
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Validate products exist and calculate totals
    let orderTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(400).json({ 
          message: `Product ${item.name} not found` 
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
        });
      }

      const itemTotal = product.price * item.quantity;
      orderTotal += itemTotal;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: item.image || (product.images && product.images[0] ? product.images[0].url : null)
      });
    }

    // Calculate shipping cost (free shipping over 500 lei)
    const shippingCost = orderTotal >= 500 ? 0 : 25;
    const grandTotal = orderTotal + shippingCost;

    // Create the order
    const guestOrder = new GuestOrder({
      guestEmail: guestEmail.toLowerCase(),
      guestPhone,
      guestName,
      items: validatedItems,
      shippingAddress,
      billingAddress: billingAddress || { ...shippingAddress, sameAsShipping: true },
      orderTotal,
      shippingCost,
      grandTotal,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      notes
    });

    await guestOrder.save();

    // Update product stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity, purchaseCount: item.quantity } }
      );
    }

    // Note: SmartBill invoice generation is now handled manually in admin panel
    // Guest orders are created with pending status for admin review and approval
    let invoiceData = null;
    let paymentURL = null;

    console.log('Guest order created successfully:', guestOrder.orderNumber);

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        orderNumber: guestOrder.orderNumber,
        guestEmail: guestOrder.guestEmail,
        items: guestOrder.items,
        orderTotal: guestOrder.orderTotal,
        shippingCost: guestOrder.shippingCost,
        grandTotal: guestOrder.grandTotal,
        status: guestOrder.status,
        createdAt: guestOrder.createdAt,
        invoice: invoiceData,
        paymentURL: paymentURL
      }
    });

  } catch (error) {
    console.error('Error creating guest order:', error);
    res.status(500).json({ 
      message: 'Error creating order', 
      error: error.message 
    });
  }
});

// Track guest order by order number and email
router.post('/track', async (req, res) => {
  try {
    const { orderNumber, email } = req.body;

    if (!orderNumber || !email) {
      return res.status(400).json({ 
        message: 'Order number and email are required' 
      });
    }

    const order = await GuestOrder.findOne({
      orderNumber: orderNumber.toUpperCase(),
      guestEmail: email.toLowerCase()
    }).populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found. Please check your order number and email address.' 
      });
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
      shippingAddress: order.shippingAddress,
      orderTotal: order.orderTotal,
      shippingCost: order.shippingCost,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
      trackingCode: order.trackingCode,
      notes: order.notes
    });

  } catch (error) {
    console.error('Error tracking guest order:', error);
    res.status(500).json({ 
      message: 'Error tracking order', 
      error: error.message 
    });
  }
});

// Get order by order number (for confirmation page)
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email parameter is required' 
      });
    }

    const order = await GuestOrder.findOne({
      orderNumber: orderNumber.toUpperCase(),
      guestEmail: email.toLowerCase()
    }).populate('items.productId', 'name images slug');

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found' 
      });
    }

    res.json(order);

  } catch (error) {
    console.error('Error fetching guest order:', error);
    res.status(500).json({ 
      message: 'Error fetching order', 
      error: error.message 
    });
  }
});

module.exports = router;