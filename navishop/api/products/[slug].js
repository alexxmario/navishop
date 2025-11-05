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
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    await connectDB();

    const { slug } = req.query;

    const product = await Product.findOne({
      slug: slug,
      status: 'active'
    }).lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment view count
    await Product.findByIdAndUpdate(product._id, {
      $inc: { viewCount: 1 }
    });

    // Get related products
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: 'active'
    })
    .limit(4)
    .select('name price originalPrice images slug averageRating totalReviews stock')
    .lean();

    res.status(200).json({
      product,
      relatedProducts
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
}