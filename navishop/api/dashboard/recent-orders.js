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
    const { limit = 5 } = req.query;

    // Mock recent orders data (replace with real orders collection query when available)
    const recentOrders = [
      {
        id: '1',
        orderNumber: 'ORD-2024-001',
        customer: 'Ion Popescu',
        product: 'Navigatie BMW X5',
        amount: '2,150 RON',
        status: 'Pending',
        orderType: 'registered'
      },
      {
        id: '2',
        orderNumber: 'ORD-2024-002',
        customer: 'Maria Ionescu',
        product: 'Navigatie Audi A4',
        amount: '1,890 RON',
        status: 'Processing',
        orderType: 'guest'
      },
      {
        id: '3',
        orderNumber: 'ORD-2024-003',
        customer: 'Alexandru Stanescu',
        product: 'Navigatie Mercedes C-Class',
        amount: '2,340 RON',
        status: 'Shipped',
        orderType: 'registered'
      },
      {
        id: '4',
        orderNumber: 'ORD-2024-004',
        customer: 'Elena Vasile',
        product: 'Navigatie VW Golf',
        amount: '1,650 RON',
        status: 'Delivered',
        orderType: 'registered'
      },
      {
        id: '5',
        orderNumber: 'ORD-2024-005',
        customer: 'Mihai Georgescu',
        product: 'Navigatie Toyota Rav4',
        amount: '1,980 RON',
        status: 'Processing',
        orderType: 'guest'
      }
    ];

    res.status(200).json(recentOrders.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Dashboard recent orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
