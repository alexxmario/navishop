const express = require('express');
const Order = require('../models/Order');
const GuestOrder = require('../models/GuestOrder');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get overall dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Only allow admin users to access dashboard stats
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalUsers,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue,
      monthlyRevenue
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({
        status: 'active',
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
        stock: { $gt: 0 }
      }),
      User.countDocuments({ role: { $ne: 'admin' } }),

      // Count orders from both collections
      Promise.all([
        Order.countDocuments({ status: 'pending' }),
        GuestOrder.countDocuments({ status: 'pending' })
      ]).then(([orders, guestOrders]) => orders + guestOrders),

      Promise.all([
        Order.countDocuments({ status: 'processing' }),
        GuestOrder.countDocuments({ status: 'processing' })
      ]).then(([orders, guestOrders]) => orders + guestOrders),

      Promise.all([
        Order.countDocuments({ status: 'shipped' }),
        GuestOrder.countDocuments({ status: 'shipped' })
      ]).then(([orders, guestOrders]) => orders + guestOrders),

      Promise.all([
        Order.countDocuments({ status: 'delivered' }),
        GuestOrder.countDocuments({ status: 'delivered' })
      ]).then(([orders, guestOrders]) => orders + guestOrders),

      // Calculate total revenue from both collections
      Promise.all([
        Order.aggregate([
          { $match: { status: { $in: ['delivered', 'shipped'] } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        GuestOrder.aggregate([
          { $match: { status: { $in: ['delivered', 'shipped'] } } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]).then(([orderRevenue, guestOrderRevenue]) => {
        const orderTotal = orderRevenue[0]?.total || 0;
        const guestTotal = guestOrderRevenue[0]?.total || 0;
        return orderTotal + guestTotal;
      }),

      // Calculate current month revenue
      Promise.all([
        Order.aggregate([
          {
            $match: {
              status: { $in: ['delivered', 'shipped'] },
              createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        GuestOrder.aggregate([
          {
            $match: {
              status: { $in: ['delivered', 'shipped'] },
              createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]).then(([orderRevenue, guestOrderRevenue]) => {
        const orderTotal = orderRevenue[0]?.total || 0;
        const guestTotal = guestOrderRevenue[0]?.total || 0;
        return orderTotal + guestTotal;
      })
    ]);

    const stats = {
      products: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        inactive: totalProducts - activeProducts
      },
      orders: {
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        total: pendingOrders + processingOrders + shippedOrders + deliveredOrders
      },
      revenue: {
        total: totalRevenue,
        thisMonth: monthlyRevenue
      },
      users: {
        total: totalUsers
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics', error: error.message });
  }
});

// Get monthly sales data for charts
router.get('/sales', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { months = 12 } = req.query;
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

    // Get sales data from both order collections
    const [orderSales, guestOrderSales] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: monthsAgo },
            status: { $in: ['delivered', 'shipped', 'processing'] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      GuestOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: monthsAgo },
            status: { $in: ['delivered', 'shipped', 'processing'] }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Combine and format data
    const combinedData = {};

    // Process regular orders
    orderSales.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      combinedData[key] = {
        year: item._id.year,
        month: item._id.month,
        orders: item.orders,
        revenue: item.revenue
      };
    });

    // Add guest orders
    guestOrderSales.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      if (combinedData[key]) {
        combinedData[key].orders += item.orders;
        combinedData[key].revenue += item.revenue;
      } else {
        combinedData[key] = {
          year: item._id.year,
          month: item._id.month,
          orders: item.orders,
          revenue: item.revenue
        };
      }
    });

    // Convert to array and format for charts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const salesData = Object.values(combinedData).map(item => ({
      month: monthNames[item.month - 1],
      year: item.year,
      orders: item.orders,
      revenue: Math.round(item.revenue)
    }));

    res.json(salesData);
  } catch (error) {
    console.error('Dashboard sales error:', error);
    res.status(500).json({ message: 'Error fetching sales data', error: error.message });
  }
});

// Get recent orders for dashboard
router.get('/recent-orders', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { limit = 5 } = req.query;

    // Get recent orders from both collections
    const [recentOrders, recentGuestOrders] = await Promise.all([
      Order.find()
        .populate('userId', 'name email')
        .populate('items.productId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2), // Get more to ensure we have enough after combining

      GuestOrder.find()
        .populate('items.productId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2)
    ]);

    // Combine and format orders
    const combinedOrders = [
      ...recentOrders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.userId?.name || 'Unknown',
        email: order.userId?.email || 'No email',
        product: order.items[0]?.name || order.items[0]?.productId?.name || 'No product',
        amount: `${order.total?.toFixed(2) || '0.00'} RON`,
        status: order.status,
        createdAt: order.createdAt,
        orderType: 'authenticated'
      })),
      ...recentGuestOrders.map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.guestName || 'Guest User',
        email: order.guestEmail || 'No email',
        product: order.items[0]?.name || order.items[0]?.productId?.name || 'No product',
        amount: `${order.total?.toFixed(2) || '0.00'} RON`,
        status: order.status,
        createdAt: order.createdAt,
        orderType: 'guest'
      }))
    ];

    // Sort by creation date and limit
    combinedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limitedOrders = combinedOrders.slice(0, parseInt(limit));

    res.json(limitedOrders);
  } catch (error) {
    console.error('Dashboard recent orders error:', error);
    res.status(500).json({ message: 'Error fetching recent orders', error: error.message });
  }
});

// Get product distribution by category
router.get('/product-distribution', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const distribution = await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Format for pie chart with colors
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000'];
    const categoryNames = {
      'navigatii-gps': 'GPS Navigation',
      'carplay-android': 'CarPlay & Android',
      'camere-marsarier': 'Backup Cameras',
      'sisteme-multimedia': 'Multimedia Systems',
      'dvr': 'DVR Systems',
      'accesorii': 'Accessories'
    };

    const formattedData = distribution.map((item, index) => ({
      name: categoryNames[item._id] || item._id,
      value: item.count,
      color: colors[index % colors.length]
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Dashboard product distribution error:', error);
    res.status(500).json({ message: 'Error fetching product distribution', error: error.message });
  }
});

module.exports = router;