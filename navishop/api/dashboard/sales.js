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
    const { months = 6 } = req.query;

    // Mock sales data for the last 6 months
    const salesData = [
      { month: 'Ian', orders: 23, revenue: 12500 },
      { month: 'Feb', orders: 45, revenue: 18750 },
      { month: 'Mar', orders: 32, revenue: 15200 },
      { month: 'Apr', orders: 28, revenue: 14300 },
      { month: 'Mai', orders: 38, revenue: 19800 },
      { month: 'Iun', orders: 42, revenue: 21600 }
    ];

    res.status(200).json(salesData.slice(-parseInt(months)));
  } catch (error) {
    console.error('Dashboard sales error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
