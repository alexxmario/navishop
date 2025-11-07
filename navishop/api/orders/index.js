import { getDb } from '../../lib/mongoClient';
import verifyAdminRequest from '../../lib/utils/verifyAdmin';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify admin access for all operations
    verifyAdminRequest(req);

    const db = await getDb();
    const orders = db.collection('orders');

    if (req.method === 'GET') {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder;

      const totalOrders = await orders.countDocuments();
      const orderList = await orders
        .find({})
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();

      res.status(200).json({
        data: orderList,
        total: totalOrders,
        page,
        totalPages: Math.ceil(totalOrders / limit)
      });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Orders API error:', error);
    if (error.status === 401) {
      res.status(401).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
