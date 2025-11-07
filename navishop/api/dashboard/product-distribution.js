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
    const products = db.collection('products');

    // Get product distribution by brand
    const pipeline = [
      { $match: { status: 'active' } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];

    const brandDistribution = await products.aggregate(pipeline).toArray();

    // Transform data for the pie chart
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
      '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'
    ];

    const productDistribution = brandDistribution.map((item, index) => ({
      name: item._id || 'Unknown',
      value: item.count,
      color: colors[index % colors.length]
    }));

    res.status(200).json(productDistribution);
  } catch (error) {
    console.error('Dashboard product distribution error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
