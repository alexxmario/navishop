import { getDb } from '../../lib/mongoClient';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = await getDb();

    // Get product stats
    const products = db.collection('products');
    const activeProducts = await products.countDocuments({ status: 'active' });
    const lowStockProducts = await products.countDocuments({
      status: 'active',
      stock: { $lt: 10 }
    });

    // Get order stats (mock data for now since we don't have orders collection)
    const orders = {
      pending: 5,
      processing: 3,
      shipped: 8,
      delivered: 45
    };

    // Get user stats (mock data for now since we don't have users collection)
    const users = {
      total: 150,
      newThisMonth: 12
    };

    // Get revenue stats (mock data for now)
    const revenue = {
      thisMonth: 15750,
      total: 125420,
      lastMonth: 18200
    };

    const stats = {
      orders,
      products: {
        active: activeProducts,
        lowStock: lowStockProducts
      },
      users,
      revenue
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
