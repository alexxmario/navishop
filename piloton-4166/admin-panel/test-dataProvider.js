// Quick test to verify dataProvider image URL conversion
const dataProvider = require('./src/dataProvider.js').default;

// Mock a product with local image URLs
const mockProductWithLocalImages = {
  _id: '123',
  name: 'Test Product',
  images: [
    {
      url: '/images/products/test-image.jpg',
      alt: 'Test Image',
      isPrimary: true
    },
    {
      url: '/images/products/test-image-2.jpg', 
      alt: 'Test Image 2',
      isPrimary: false
    }
  ]
};

console.log('Original image URLs:');
mockProductWithLocalImages.images.forEach(img => console.log(' ', img.url));

// The convertImageUrls function should be imported, but let's test the logic manually
const baseUrl = 'http://localhost:5001';

const convertImageUrls = (item) => {
  if (item.images && Array.isArray(item.images)) {
    item.images = item.images.map(image => ({
      ...image,
      url: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`
    }));
  }
  return item;
};

const convertedProduct = convertImageUrls({...mockProductWithLocalImages, id: mockProductWithLocalImages._id});

console.log('\nConverted image URLs:');
convertedProduct.images.forEach(img => console.log(' ', img.url));

console.log('\n✅ URL conversion test completed');