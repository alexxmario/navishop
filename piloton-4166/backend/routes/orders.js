const express = require('express');
const Order = require('../models/Order');
const GuestOrder = require('../models/GuestOrder');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const smartbillService = require('../services/smartbillServiceCorrect');
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

    // Calculate shipping cost (free shipping over 500 lei)
    const shippingCost = orderTotal >= 500 ? 0 : 25;
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
            // For authenticated user orders
            const User = require('../models/User');
            const user = await User.findById(order.userId);
            
            orderForInvoice = {
              orderNumber: order.orderNumber,
              guestName: user.name,
              guestEmail: user.email,
              guestPhone: user.phone || '',
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
            if (order.paymentMethod === 'smartbill_online') {
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
        
        // Generate Fan Courier AWB
        try {
          let customerName, customerPhone;
          
          if (isGuestOrder) {
            customerName = order.guestName;
            customerPhone = order.guestPhone || order.shippingAddress.phone || '0700000000';
          } else {
            customerName = order.userId.name;
            customerPhone = order.shippingAddress.phone || '0700000000';
          }
          
          const awbResult = await fanCourierService.generateAWB({
            orderId: order._id,
            orderNumber: order.orderNumber,
            customerName: customerName,
            customerPhone: customerPhone,
            shippingAddress: order.shippingAddress,
            items: order.items,
            totalValue: order.grandTotal,
            paymentType: order.paymentMethod === 'cash_on_delivery' ? 'ramburs' : 'expeditor'
          });

          if (awbResult.success) {
            // Initialize shipping object if it doesn't exist
            if (!order.shipping) {
              order.shipping = {};
            }
            
            order.shipping.awbNumber = awbResult.awbNumber;
            order.shipping.pdfLink = awbResult.pdfLink;
            order.shipping.estimatedDelivery = awbResult.estimatedDelivery;
            
            // Generate tracking code
            if (!order.trackingCode) {
              const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
              order.trackingCode = `TRK${random}`;
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

module.exports = router;