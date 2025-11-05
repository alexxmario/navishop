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
    const { productId } = req.query;

    // For now, return mock review stats since we don't have a review system implemented
    const mockStats = {
      totalReviews: Math.floor(Math.random() * 50) + 5,
      averageRating: +(Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
      ratingDistribution: {
        1: Math.floor(Math.random() * 3),
        2: Math.floor(Math.random() * 5),
        3: Math.floor(Math.random() * 8),
        4: Math.floor(Math.random() * 15) + 5,
        5: Math.floor(Math.random() * 20) + 10
      }
    };

    res.status(200).json(mockStats);
  } catch (error) {
    console.error('Review stats API error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review stats',
      error: error.message
    });
  }
}