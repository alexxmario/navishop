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

    const {
      page = 1,
      limit = 12,
      category,
      brand,
      featured,
      search
    } = req.query;

    const query = { status: 'active' };

    if (category) query.category = category;
    if (brand) query.brand = new RegExp(brand, 'i');
    if (featured !== undefined) query.featured = featured === 'true';

    let products;

    if (search) {
      products = await Product.find({
        ...query,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } }
        ]
      })
      .select('name price originalPrice images slug averageRating totalReviews stock category brand featured')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();
    } else {
      products = await Product.find(query)
        .select('name price originalPrice images slug averageRating totalReviews stock category brand featured')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort({ createdAt: -1 })
        .lean();
    }

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      products,
      totalProducts: total,
      totalPages,
      currentPage: parseInt(page),
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
}