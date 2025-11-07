import { ObjectId } from 'mongodb';
import { getDb } from '../../../../lib/mongoClient';

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
    const { productId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const db = await getDb();
    const reviews = db.collection('reviews');

    const skip = (page - 1) * limit;

    // Query for reviews of the specific product
    const query = { productId: new ObjectId(productId) };

    const totalReviews = await reviews.countDocuments(query);
    const reviewList = await reviews
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).json({
      reviews: reviewList,
      pagination: {
        totalReviews,
        page,
        limit,
        totalPages: Math.ceil(totalReviews / limit)
      }
    });
  } catch (error) {
    console.error('Product reviews API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
