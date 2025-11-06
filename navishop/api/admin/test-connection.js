import connectDB from '../../lib/mongodb';
import Product from '../../lib/models/Product';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Get a count of total products
    const totalProducts = await Product.countDocuments();

    // Get count of products with structured descriptions
    const productsWithStructured = await Product.countDocuments({
      'structuredDescription.sections.0': { $exists: true }
    });

    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      totalProducts,
      productsWithStructured,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
}