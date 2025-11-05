import connectDB from '../../../lib/mongodb';
import Product from '../../../lib/models/Product';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    await connectDB();

    const { productId } = req.query;

    // Get the current product to understand its brand/category
    const currentProduct = await Product.findById(productId).lean();

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find related products (same brand or category, but not the current product)
    const relatedProducts = await Product.find({
      $and: [
        { _id: { $ne: productId } },
        { status: 'active' },
        {
          $or: [
            { brand: currentProduct.brand },
            { category: currentProduct.category }
          ]
        }
      ]
    })
    .select('name price originalPrice images slug brand category')
    .limit(4)
    .lean();

    res.status(200).json(relatedProducts);
  } catch (error) {
    console.error('Cross-sell API error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cross-sell products',
      error: error.message
    });
  }
}