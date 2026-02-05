const express = require('express');
const Order = require('../models/Order');
const GuestOrder = require('../models/GuestOrder');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const smartbillService = require('../services/smartbillServiceCorrect');
const euplatescService = require('../services/euplatescService');
const fanCourierService = require('../services/fanCourierService');
const router = express.Router();

// Get user's orders
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      paymentMethod,
      paymentStatus,
      orderNumber,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      createdFrom,
      createdTo
    } = req.query;

    // Base query: If user is admin, return all orders; otherwise, return only user's orders
    const query = req.user.role === 'admin' ? {} : { userId: req.userId };
    
    // Add filters
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (orderNumber) query.orderNumber = new RegExp(orderNumber, 'i');
    
    // Date range filter
    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
      if (createdTo) query.createdAt.$lte = new Date(createdTo);
    }
    
    // Search in customer info
    if (search) {
      query.$or = [
        { orderNumber: new RegExp(search, 'i') },
        { 'shippingAddress.firstName': new RegExp(search, 'i') },
        { 'shippingAddress.lastName': new RegExp(search, 'i') },
        { 'shippingAddress.email': new RegExp(search, 'i') }
      ];
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let orders, total;
    
    if (req.user.role === 'admin') {
      // For admin users, combine regular orders and guest orders
      const regularOrders = await Order.find(query)
        .populate('items.productId', 'name images slug')
        .populate('userId', 'name email')
        .sort(sortOptions);

      const guestOrders = await GuestOrder.find({
        ...query,
        userId: undefined // Remove userId filter for guest orders
      })
        .populate('items.productId', 'name images slug')
        .sort(sortOptions);

      // Combine and mark guest orders
      const combinedOrders = [
        ...regularOrders.map(order => ({ ...order.toObject(), orderType: 'authenticated' })),
        ...guestOrders.map(order => ({ 
          ...order.toObject(), 
          orderType: 'guest',
          userId: { 
            name: order.guestName, 
            email: order.guestEmail 
          },
          // Add shippingAddress name fields for consistency with regular orders
          shippingAddress: {
            ...order.shippingAddress,
            firstName: order.guestName.split(' ')[0] || order.guestName,
            lastName: order.guestName.split(' ').slice(1).join(' ') || ''
          }
        }))
      ];

      // Sort combined orders
      combinedOrders.sort((a, b) => {
        const aValue = a[sortOptions.createdAt ? 'createdAt' : 'updatedAt'];
        const bValue = b[sortOptions.createdAt ? 'createdAt' : 'updatedAt'];
        return sortOptions.createdAt === -1 ? new Date(bValue) - new Date(aValue) : new Date(aValue) - new Date(bValue);
      });

      // Apply pagination
      orders = combinedOrders.slice(skip, skip + parseInt(limit));
      total = combinedOrders.length;
    } else {
      // For regular users, only show their orders
      orders = await Order.find(query)
        .populate('items.productId', 'name images slug')
        .populate('userId', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      total = await Order.countDocuments(query);
    }

    res.json({
      data: orders,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      message: 'Error fetching orders', 
      error: error.message 
    });
  }
});

// Get single order by ID (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    let order = null;
    
    if (req.user.role === 'admin') {
      // For admin, try to find in both regular orders and guest orders
      order = await Order.findById(req.params.id)
        .populate('items.productId', 'name images slug')
        .populate('userId', 'name email');
      
      if (!order) {
        // Try guest orders
        const guestOrder = await GuestOrder.findById(req.params.id)
          .populate('items.productId', 'name images slug');
        
        if (guestOrder) {
          order = {
            ...guestOrder.toObject(),
            orderType: 'guest',
            userId: { 
              name: guestOrder.guestName, 
              email: guestOrder.guestEmail 
            },
            // Add shippingAddress name fields for consistency
            shippingAddress: {
              ...guestOrder.shippingAddress,
              firstName: guestOrder.guestName.split(' ')[0] || guestOrder.guestName,
              lastName: guestOrder.guestName.split(' ').slice(1).join(' ') || ''
            }
          };
        }
      } else {
        order = { ...order.toObject(), orderType: 'authenticated' };
      }
    } else {
      // For regular users, only show their orders
      order = await Order.findOne({ _id: req.params.id, userId: req.userId })
        .populate('items.productId', 'name images slug')
        .populate('userId', 'name email');
      
      if (order) {
        order = { ...order.toObject(), orderType: 'authenticated' };
      }
    }
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      message: 'Error fetching order', 
      error: error.message 
    });
  }
});

// Create authenticated user order
router.post('/', auth, async (req, res) => {
  try {
    console.log('User order request received:', req.body);
    console.log('Content-Type received:', req.get('Content-Type'));

    if (!req.body) {
      return res.status(400).json({ 
        message: 'Request body is missing. Please ensure Content-Type is application/json and body is properly formatted.' 
      });
    }

    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes
    } = req.body;

    // Validate required fields
    if (!items || !shippingAddress) {
      return res.status(400).json({ 
        message: 'Missing required fields: items and shipping address are required' 
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

    const shippingOption = req.body.shippingOption || req.body.shippingInfo || {};
    const requestedShippingCost = typeof req.body.shippingCost === 'number'
      ? req.body.shippingCost
      : typeof shippingOption.cost === 'number'
        ? shippingOption.cost
        : null;

    const shippingCost = requestedShippingCost !== null
      ? Math.max(0, requestedShippingCost)
      : orderTotal >= 500 ? 0 : 25;
    const grandTotal = orderTotal + shippingCost;

    // Create the order
    const order = new Order({
      userId: req.userId,
      items: validatedItems,
      shippingAddress,
      billingAddress: billingAddress || { ...shippingAddress, sameAsShipping: true },
      orderTotal,
      shippingCost,
      grandTotal,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      notes
    });

    if (shippingOption && (shippingOption.name || shippingOption.service)) {
      order.shipping = {
        provider: shippingOption.provider || 'fan_courier',
        service: shippingOption.service || shippingOption.name,
        cost: shippingCost,
        estimatedDelivery: shippingOption.estimatedDelivery || undefined
      };
    }

    await order.save();

    // Update product stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity, purchaseCount: item.quantity } }
      );
    }

    // Note: SmartBill invoice generation is now handled manually in admin panel
    // Orders are created with pending status for admin review and approval
    let invoiceData = null;
    let paymentURL = null;

    if (order.paymentMethod === 'card') {
      try {
        const baseReturnUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const paymentResult = euplatescService.createPayment(order, {
          description: `Plata pentru comanda ${order.orderNumber}`,
          returnURL: `${baseReturnUrl}/payment/success?paymentId=:paymentId&orderNumber=:orderNumber`,
          cancelURL: `${baseReturnUrl}/payment/cancel?paymentId=:paymentId&orderNumber=:orderNumber`
        });

        order.paymentId = paymentResult.paymentId;
        order.paymentStatus = 'pending';
        await order.save();

        paymentURL = paymentResult.paymentURL;
      } catch (paymentError) {
        console.error('Failed to initialize EuPlatesc payment for user order:', paymentError);
      }
    }

    console.log('User order created successfully:', order.orderNumber);

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        orderNumber: order.orderNumber,
        items: order.items,
        orderTotal: order.orderTotal,
        shippingCost: order.shippingCost,
        grandTotal: order.grandTotal,
        status: order.status,
        createdAt: order.createdAt,
        invoice: invoiceData,
        paymentURL: paymentURL
      }
    });

  } catch (error) {
    console.error('Error creating user order:', error);
    res.status(500).json({ 
      message: 'Error creating order', 
      error: error.message 
    });
  }
});

// Get specific order by ID
router.get('/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.userId
    }).populate('items.productId', 'name images slug');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      message: 'Error fetching order', 
      error: error.message 
    });
  }
});

// Admin manual order creation (for customers or guests)
router.post('/admin/manual', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      customerType = 'guest',
      userId,
      guestName,
      guestEmail,
      guestPhone,
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes,
      shippingCost: requestedShippingCost,
      generateInvoice = false
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.county || !shippingAddress.postalCode) {
      return res.status(400).json({ message: 'Shipping address is incomplete' });
    }

    if (customerType === 'existing' && !userId) {
      return res.status(400).json({ message: 'User ID is required for existing customers' });
    }

    if (customerType === 'guest') {
      if (!guestName || !guestEmail || !guestPhone) {
        return res.status(400).json({ message: 'Guest name, email, and phone are required' });
      }
    }

    // Validate products and calculate totals
    let orderTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ message: 'Each item requires productId and quantity' });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product with ID ${item.productId} not found` });
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

    const normalizedShippingCost = typeof requestedShippingCost === 'number'
      ? Math.max(0, requestedShippingCost)
      : orderTotal >= 500 ? 0 : 25;

    const grandTotal = orderTotal + normalizedShippingCost;

    let createdOrder = null;
    let orderType = 'authenticated';
    let invoiceInfo = null;

    if (customerType === 'existing') {
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      createdOrder = new Order({
        userId: existingUser._id,
        items: validatedItems,
        shippingAddress,
        billingAddress: billingAddress || { ...shippingAddress, sameAsShipping: true },
        orderTotal,
        shippingCost: normalizedShippingCost,
        grandTotal,
        paymentMethod: paymentMethod || 'cash_on_delivery',
        notes,
        status: req.body.status || 'pending'
      });

      await createdOrder.save();
      orderType = 'authenticated';
    } else {
      // guest order
      createdOrder = new GuestOrder({
        guestEmail: guestEmail.toLowerCase(),
        guestPhone,
        guestName,
        items: validatedItems,
        shippingAddress,
        billingAddress: billingAddress || { ...shippingAddress, sameAsShipping: true },
        orderTotal,
        shippingCost: normalizedShippingCost,
        grandTotal,
        paymentMethod: paymentMethod || 'cash_on_delivery',
        notes,
        status: req.body.status || 'pending'
      });

      await createdOrder.save();
      orderType = 'guest';
    }

    // Update stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity, purchaseCount: item.quantity } }
      );
    }

    if (generateInvoice) {
      try {
        let invoicePayload;

        if (orderType === 'guest') {
          invoicePayload = {
            orderNumber: createdOrder.orderNumber,
            guestName,
            guestEmail: guestEmail.toLowerCase(),
            guestPhone,
            items: createdOrder.items,
            shippingAddress: createdOrder.shippingAddress,
            billingAddress: createdOrder.billingAddress.sameAsShipping ? createdOrder.shippingAddress : createdOrder.billingAddress,
            shippingCost: createdOrder.shippingCost,
            notes: createdOrder.notes
          };
        } else {
          const orderUser = await User.findById(userId);
          invoicePayload = {
            orderNumber: createdOrder.orderNumber,
            guestName: orderUser.name,
            guestEmail: orderUser.email,
            guestPhone: orderUser.phone || shippingAddress.phone || '',
            items: createdOrder.items,
            shippingAddress: createdOrder.shippingAddress,
            billingAddress: createdOrder.billingAddress.sameAsShipping ? createdOrder.shippingAddress : createdOrder.billingAddress,
            shippingCost: createdOrder.shippingCost,
            notes: createdOrder.notes
          };
        }

        const invoiceResult = await smartbillService.createInvoice(invoicePayload);
        if (invoiceResult.success) {
          createdOrder.invoice = {
            invoiceId: invoiceResult.invoiceId,
            invoiceNumber: invoiceResult.invoiceNumber,
            createdAt: new Date()
          };
          await createdOrder.save();
          invoiceInfo = invoiceResult;
        } else {
          invoiceInfo = { error: invoiceResult.error };
        }
      } catch (invoiceError) {
        console.error('Manual order SmartBill error:', invoiceError);
        invoiceInfo = { error: invoiceError.message };
      }
    }

    const responseOrder = {
      ...createdOrder.toObject(),
      orderType,
      id: createdOrder._id
    };

    res.status(201).json({
      message: 'Manual order created successfully',
      id: createdOrder._id,
      orderType,
      order: responseOrder,
      invoice: invoiceInfo
    });
  } catch (error) {
    console.error('Admin manual order creation error:', error);
    res.status(500).json({
      message: 'Failed to create manual order',
      error: error.message
    });
  }
});

// Create shipping label for order (admin only - would need admin auth in real app)
router.post('/:orderId/ship', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.userId
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ message: 'Order already shipped' });
    }

    // Create FAN Courier shipment
    const shipmentResult = await fanCourierService.createShipment(order);

    if (shipmentResult.success) {
      // Update order with shipping information
      order.status = 'shipped';
      order.trackingCode = shipmentResult.trackingCode;
      order.shipping = {
        provider: 'fan_courier',
        awbNumber: shipmentResult.awbNumber,
        cost: shipmentResult.cost,
        pdfLink: shipmentResult.pdfLink
      };

      await order.save();

      res.json({
        message: 'Shipping label created successfully',
        awbNumber: shipmentResult.awbNumber,
        trackingCode: shipmentResult.trackingCode,
        pdfLink: shipmentResult.pdfLink,
        cost: shipmentResult.cost
      });
    } else {
      res.status(500).json({
        message: 'Failed to create shipping label',
        error: shipmentResult.error
      });
    }
  } catch (error) {
    console.error('Error creating shipping label:', error);
    res.status(500).json({ 
      message: 'Error creating shipping label', 
      error: error.message 
    });
  }
});

// Track order shipment
router.get('/:orderId/track', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.userId
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.trackingCode) {
      return res.status(400).json({ message: 'Order not yet shipped - no tracking code available' });
    }

    const trackingResult = await fanCourierService.trackOrder(order.trackingCode);

    if (trackingResult.success) {
      // Update order status based on tracking info
      const newStatus = fanCourierService.mapStatusToOrderStatus(trackingResult.status);
      if (newStatus !== order.status) {
        order.status = newStatus;
        if (newStatus === 'delivered' && trackingResult.deliveryDate) {
          order.shipping.actualDelivery = new Date(trackingResult.deliveryDate);
        }
        await order.save();
      }

      res.json({
        trackingCode: order.trackingCode,
        status: trackingResult.status,
        statusDescription: trackingResult.statusDescription,
        history: trackingResult.history,
        deliveryDate: trackingResult.deliveryDate,
        recipientName: trackingResult.recipientName
      });
    } else {
      res.status(500).json({
        message: 'Failed to track shipment',
        error: trackingResult.error
      });
    }
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ 
      message: 'Error tracking order', 
      error: error.message 
    });
  }
});

// Manual order processing endpoints (admin only)
router.put('/:orderId/process', auth, async (req, res) => {
  try {
    // Only allow admin users to process orders
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { action } = req.body;
    let order = null;
    let isGuestOrder = false;

    // Try to find in regular orders first
    order = await Order.findById(req.params.orderId)
      .populate('items.productId', 'name images slug')
      .populate('userId', 'name email');

    if (!order) {
      // Try guest orders
      const guestOrder = await GuestOrder.findById(req.params.orderId)
        .populate('items.productId', 'name images slug');
      
      if (guestOrder) {
        order = guestOrder;
        isGuestOrder = true;
      }
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let responseData = { order };

    switch (action) {
      case 'confirm':
        if (order.status !== 'pending') {
          return res.status(400).json({ message: 'Order can only be confirmed from pending status' });
        }
        order.status = 'confirmed';
        responseData.message = 'Order confirmed successfully';
        break;

      case 'process':
        if (order.status !== 'confirmed') {
          return res.status(400).json({ message: 'Order can only be processed from confirmed status' });
        }
        order.status = 'processing';
        
        // Generate SmartBill invoice - this is now done manually by admin
        try {
          let orderForInvoice;
          
          if (isGuestOrder) {
            // For guest orders
            orderForInvoice = {
              orderNumber: order.orderNumber,
              guestName: order.guestName,
              guestEmail: order.guestEmail,
              guestPhone: order.guestPhone || '',
              items: order.items,
              shippingAddress: order.shippingAddress,
              billingAddress: order.billingAddress.sameAsShipping ? order.shippingAddress : order.billingAddress,
              shippingCost: order.shippingCost,
              notes: order.notes
            };
          } else {
            // For authenticated user orders - userId is already populated with name/email
            orderForInvoice = {
              orderNumber: order.orderNumber,
              guestName: order.userId?.name || order.shippingAddress?.name || 'Client',
              guestEmail: order.userId?.email || '',
              guestPhone: order.shippingAddress?.phone || '',
              items: order.items,
              shippingAddress: order.shippingAddress,
              billingAddress: order.billingAddress.sameAsShipping ? order.shippingAddress : order.billingAddress,
              shippingCost: order.shippingCost,
              notes: order.notes
            };
          }

          const invoiceResult = await smartbillService.createInvoice(orderForInvoice);

          if (invoiceResult.success) {
            order.invoice = {
              invoiceId: invoiceResult.invoiceId,
              invoiceNumber: invoiceResult.invoiceNumber,
              createdAt: new Date()
            };
            
            // Generate payment URL for online payments if needed
            if (order.paymentMethod === 'card' || order.paymentMethod === 'smartbill_online') {
              const paymentResult = await smartbillService.getPaymentURL(
                { invoiceNumber: invoiceResult.invoiceNumber, total: order.grandTotal },
                `${process.env.FRONTEND_URL}/payment/success`,
                `${process.env.FRONTEND_URL}/payment/cancel`
              );
              
              if (paymentResult.paymentId) {
                order.paymentId = paymentResult.paymentId;
              }
              
              if (paymentResult.success) {
                responseData.paymentURL = paymentResult.paymentURL;
              }
            }
            
            responseData.invoice = invoiceResult;
            responseData.message = 'Order moved to processing and SmartBill invoice generated';
          } else {
            return res.status(500).json({ 
              message: 'Failed to generate SmartBill invoice', 
              error: invoiceResult.error 
            });
          }
        } catch (invoiceError) {
          console.error('SmartBill invoice generation error:', invoiceError);
          return res.status(500).json({ 
            message: 'Failed to generate SmartBill invoice', 
            error: invoiceError.message 
          });
        }
        break;

      case 'ship':
        if (order.status !== 'processing') {
          return res.status(400).json({ message: 'Order can only be shipped from processing status' });
        }
        order.status = 'shipped';

        // Generate Fan Courier AWB using correct API
        try {
          const awbResult = await fanCourierService.createShipment(order);

          if (awbResult.success) {
            // Initialize shipping object if it doesn't exist
            if (!order.shipping) {
              order.shipping = {};
            }

            order.shipping.awbNumber = awbResult.awbNumber;
            order.shipping.cost = awbResult.cost;
            order.shipping.trackingCode = awbResult.trackingCode;

            // Set tracking code on order
            if (!order.trackingCode) {
              order.trackingCode = awbResult.trackingCode;
            }

            responseData.shipping = awbResult;
            responseData.message = 'Order shipped and AWB generated';
          } else {
            return res.status(500).json({
              message: 'Failed to generate AWB',
              error: awbResult.error
            });
          }
        } catch (shippingError) {
          console.error('AWB generation error:', shippingError);
          return res.status(500).json({
            message: 'Failed to generate AWB',
            error: shippingError.message
          });
        }
        break;

      case 'cancel':
        if (!['pending', 'confirmed'].includes(order.status)) {
          return res.status(400).json({ message: 'Order can only be cancelled from pending or confirmed status' });
        }
        order.status = 'cancelled';
        responseData.message = 'Order cancelled successfully';
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    await order.save();
    responseData.order = order;
    
    res.json(responseData);
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ 
      message: 'Error processing order', 
      error: error.message 
    });
  }
});

// Get order processing status
router.get('/:orderId/status', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow admin or order owner to see status
    if (req.user.role !== 'admin' && order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingCode: order.trackingCode,
      awbNumber: order.shipping?.awbNumber,
      estimatedDelivery: order.shipping?.estimatedDelivery,
      invoice: order.invoice
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ 
      message: 'Error fetching order status', 
      error: error.message 
    });
  }
});

// Get invoice PDF for an order (admin only)
router.get('/:orderId/invoice-pdf', auth, async (req, res) => {
  try {
    // Only allow admin users to view invoices
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    let order = null;

    // Try to find in regular orders first
    order = await Order.findById(req.params.orderId);

    if (!order) {
      // Try guest orders
      const guestOrder = await GuestOrder.findById(req.params.orderId);
      if (guestOrder) {
        order = guestOrder;
      }
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if invoice exists
    if (!order.invoice || !order.invoice.invoiceNumber) {
      return res.status(404).json({ message: 'Invoice not yet generated for this order' });
    }

    // Fetch PDF from SmartBill
    const pdfResult = await smartbillService.getInvoicePDF(order.invoice.invoiceNumber);

    if (!pdfResult.success) {
      return res.status(500).json({
        message: 'Failed to retrieve invoice PDF from SmartBill',
        error: pdfResult.error
      });
    }

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="factura-${order.invoice.invoiceNumber}.pdf"`);
    res.send(Buffer.from(pdfResult.pdf));

  } catch (error) {
    console.error('Error fetching invoice PDF:', error);
    res.status(500).json({
      message: 'Error fetching invoice PDF',
      error: error.message
    });
  }
});

// Get AWB label PDF for an order (admin only)
router.get('/:orderId/awb-pdf', auth, async (req, res) => {
  try {
    // Only allow admin users to view AWB labels
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    let order = null;

    // Try to find in regular orders first
    order = await Order.findById(req.params.orderId);

    if (!order) {
      // Try guest orders
      const guestOrder = await GuestOrder.findById(req.params.orderId);
      if (guestOrder) {
        order = guestOrder;
      }
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order has AWB number
    if (!order.shipping?.awbNumber) {
      return res.status(400).json({
        message: 'No AWB number found for this order. Order must be shipped first.'
      });
    }

    // Get AWB label PDF from Fan Courier
    const pdfResult = await fanCourierService.getAWBLabelPDF(order.shipping.awbNumber);

    if (!pdfResult.success) {
      return res.status(500).json({
        message: 'Failed to retrieve AWB label',
        error: pdfResult.error
      });
    }

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="awb-${order.shipping.awbNumber}.pdf"`);
    res.send(Buffer.from(pdfResult.pdf));

  } catch (error) {
    console.error('Error fetching AWB label PDF:', error);
    res.status(500).json({
      message: 'Error fetching AWB label PDF',
      error: error.message
    });
  }
});

module.exports = router;
