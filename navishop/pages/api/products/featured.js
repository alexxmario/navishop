export default function handler(req, res) {
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

  // Mock featured products data
  const featuredProducts = [
    {
      _id: '1',
      name: 'Navigație GPS Premium BMW Seria 3',
      slug: 'navigatie-gps-premium-bmw-seria-3',
      price: 899,
      originalPrice: 1099,
      category: 'navigatii-gps',
      featured: true,
      stock: 15,
      averageRating: 4.8,
      totalReviews: 24,
      images: [
        {
          url: 'https://via.placeholder.com/300x200/2563eb/ffffff?text=BMW+Navigation',
          alt: 'Navigație BMW Seria 3'
        }
      ],
      compatibility: [
        { brand: 'BMW', models: ['Seria 3'], years: ['2019', '2020', '2021', '2022'] }
      ]
    },
    {
      _id: '2',
      name: 'CarPlay Android Auto Mercedes A Class',
      slug: 'carplay-android-auto-mercedes-a-class',
      price: 1299,
      category: 'carplay-android',
      featured: true,
      stock: 8,
      averageRating: 4.9,
      totalReviews: 18,
      images: [
        {
          url: 'https://via.placeholder.com/300x200/2563eb/ffffff?text=Mercedes+CarPlay',
          alt: 'CarPlay Mercedes A Class'
        }
      ],
      compatibility: [
        { brand: 'Mercedes', models: ['A Class'], years: ['2018', '2019', '2020', '2021'] }
      ]
    },
    {
      _id: '3',
      name: 'Navigație Audi Q5 cu Android Auto',
      slug: 'navigatie-audi-q5-android-auto',
      price: 1599,
      category: 'navigatii-gps',
      featured: true,
      stock: 12,
      averageRating: 4.7,
      totalReviews: 31,
      images: [
        {
          url: 'https://via.placeholder.com/300x200/2563eb/ffffff?text=Audi+Q5+Nav',
          alt: 'Navigație Audi Q5'
        }
      ],
      compatibility: [
        { brand: 'Audi', models: ['Q5'], years: ['2017', '2018', '2019', '2020'] }
      ]
    },
    {
      _id: '4',
      name: 'Sistem multimedia VW Golf 8',
      slug: 'sistem-multimedia-vw-golf-8',
      price: 799,
      category: 'navigatii-gps',
      featured: true,
      stock: 20,
      averageRating: 4.6,
      totalReviews: 15,
      images: [
        {
          url: 'https://via.placeholder.com/300x200/2563eb/ffffff?text=VW+Golf+8',
          alt: 'Sistem multimedia VW Golf 8'
        }
      ],
      compatibility: [
        { brand: 'Volkswagen', models: ['Golf'], years: ['2020', '2021', '2022', '2023'] }
      ]
    }
  ];

  res.status(200).json(featuredProducts);
}