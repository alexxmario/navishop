import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import { useRecentlyViewed } from './RecentlyViewedContext';
import apiService from './services/api';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import RecentlyViewed from './components/RecentlyViewed';
import ImageSlider360 from './components/ImageSlider360';
import {
  ShoppingCart, Star, Heart, ChevronRight, Truck, Shield, Check, Phone, Mail,
  Minus, Plus, ArrowLeft, Wifi, Bluetooth, Smartphone, MapPin, Camera, Zap,
  X, ChevronLeft
} from 'lucide-react';

const ProductPageExperimental = () => {
  const { slug } = useParams();
  const { getCartItemsCount, addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedTab, setSelectedTab] = useState('description');
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);

  // Generate test images for 360° slider
  const generateTestImages = () => {
    const testImages = [];
    // Your actual image files: Navigatie_WV_360-1.jpg to Navigatie_WV_360-17.jpg
    for (let i = 1; i <= 17; i++) {
      testImages.push({
        url: `/test-slider/Navigatie_WV_360-${i}.jpg`,
        alt: `360° View Frame ${i}`,
        isPrimary: i === 1
      });
    }
    return testImages;
  };

  const testImages = generateTestImages();

  // Extract car brand and model from product name
  const extractCarBrandModel = (productName) => {
    if (!productName) return { carBrand: null, carModel: null };
    
    // Remove "Navigatie PilotOn" prefix
    let cleanName = productName.replace(/^Navigatie\s+PilotOn\s+/i, '');
    
    // Common car brands
    const carBrands = [
      'Alfa Romeo', 'Audi', 'BMW', 'Mercedes', 'Volkswagen', 'VW', 'Toyota', 
      'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
      'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
      'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Land Rover',
      'Jaguar', 'Porsche', 'Mini', 'Smart', 'Suzuki', 'Isuzu', 'Infiniti',
      'Lexus', 'Acura', 'Genesis', 'DS', 'Cupra'
    ];
    
    // Find the brand
    let foundBrand = null;
    let brandPattern = null;
    
    for (const brand of carBrands) {
      const pattern = new RegExp(`^${brand}\\s+`, 'i');
      if (pattern.test(cleanName)) {
        foundBrand = brand;
        brandPattern = pattern;
        break;
      }
    }
    
    if (!foundBrand) {
      return { carBrand: null, carModel: null };
    }
    
    // Normalize VW to Volkswagen
    if (foundBrand.toUpperCase() === 'VW') {
      foundBrand = 'Volkswagen';
    }
    
    // Remove brand from the beginning
    cleanName = cleanName.replace(brandPattern, '');
    
    // Extract model (everything before years or specs)
    const yearPatterns = [
      /^(.+?)\s+(\d{4}-\d{4})\s+/,  // Model YYYY-YYYY
      /^(.+?)\s+(dupa\s+\d{4})\s+/, // Model dupa YYYY  
      /^(.+?)\s+(pana\s+\d{4})\s+/, // Model pana YYYY
      /^(.+?)\s+(\d{4}-prezent)\s+/, // Model YYYY-prezent
      /^(.+?)\s+(\(\d{4}-\d{4}\))\s+/, // Model (YYYY-YYYY)
      /^(.+?)\s+(\d{4})\s+/,        // Model YYYY
    ];
    
    let model = null;
    
    for (const pattern of yearPatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        model = match[1].trim();
        break;
      }
    }
    
    // If no year pattern found, try to extract model without years
    if (!model) {
      const specPatterns = [
        /^(.+?)\s+\d+\s*inch\s+/i,
        /^(.+?)\s+\d+GB\s+/i,
        /^(.+?)\s+\d+K\s+/i,
        /^(.+?)\s+\d+\s+CORE\s*/i
      ];
      
      for (const pattern of specPatterns) {
        const match = cleanName.match(pattern);
        if (match) {
          model = match[1].trim();
          break;
        }
      }
    }
    
    // Clean up model name
    if (model) {
      model = model.replace(/\s+(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s*$/i, '');
      model = model.replace(/\s+(dupa|pana|facelift|pre-facelift)\s*$/i, '');
      model = model.trim();
    }
    
    return {
      carBrand: foundBrand,
      carModel: model || null
    };
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (slug) {
      loadProduct();
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation for image gallery
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!showImageGallery) return;
      
      if (e.key === 'Escape') {
        closeImageGallery();
      } else if (e.key === 'ArrowLeft') {
        navigateGallery('prev');
      } else if (e.key === 'ArrowRight') {
        navigateGallery('next');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showImageGallery, product]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProductBySlug(slug);

      // Handle both response formats: {product} or direct product object
      const product = data.product || data;
      setProduct(product);

      // Add to recently viewed when product loads successfully
      if (product) {
        addToRecentlyViewed(product);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      setError('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    console.log('Add to cart clicked!');
    console.log('Product:', product);
    console.log('Quantity:', quantity);
    
    if (!product) {
      console.error('No product found');
      return;
    }
    
    try {
      console.log('Calling addToCart...');
      const result = await addToCart({
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity,
        images: product.images,
        slug: product.slug
      });
      console.log('Add to cart successful:', result);
      alert('Product added to cart successfully!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert(`Failed to add to cart: ${error.message}`);
    }
  };

  const openImageGallery = (index) => {
    setGalleryImageIndex(index);
    setShowImageGallery(true);
  };

  const closeImageGallery = () => {
    setShowImageGallery(false);
  };

  const navigateGallery = (direction) => {
    if (!product.images || product.images.length === 0) return;
    
    if (direction === 'prev') {
      setGalleryImageIndex(prev => 
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    } else {
      setGalleryImageIndex(prev => 
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
          <Link to="/" className="bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  
  const features = [
    { icon: <Wifi className="w-5 h-5" />, text: 'WiFi Integrat' },
    { icon: <Bluetooth className="w-5 h-5" />, text: 'Bluetooth 5.0' },
    { icon: <Smartphone className="w-5 h-5" />, text: 'Android Auto' },
    { icon: <MapPin className="w-5 h-5" />, text: 'GPS Precis' },
    { icon: <Camera className="w-5 h-5" />, text: 'Cameră Marsarier' },
    { icon: <Zap className="w-5 h-5" />, text: 'Încărcare Rapidă' },
  ];

  const reviews = [
    { name: 'Alexandru M.', rating: 5, text: 'Navigația perfectă! Instalarea a fost rapidă și funcționează excelent.', date: '15 Iunie 2024' },
    { name: 'Maria P.', rating: 5, text: 'Calitate premium, ecran clar și funcții multe. Recomand!', date: '12 Iunie 2024' },
    { name: 'Ionut R.', rating: 4, text: 'Foarte mulțumit de achiziție. Singura problemă - configurarea inițială.', date: '8 Iunie 2024' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageTitle title={product?.name} />
      <Header />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link to="/" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Acasă</span>
          </Link>
          <ChevronRight className="w-4 h-4" />
          {(() => {
            const { carBrand, carModel } = extractCarBrandModel(product.name);
            return (
              <>
                {carBrand && (
                  <>
                    <Link 
                      to={`/brand/${encodeURIComponent(carBrand.toLowerCase())}`} 
                      className="hover:text-blue-600 transition-colors"
                    >
                      {carBrand}
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
                {carModel && (
                  <>
                    <Link 
                      to={`/brand/${encodeURIComponent(carBrand.toLowerCase())}/${encodeURIComponent(carModel.toLowerCase())}`} 
                      className="hover:text-blue-600 transition-colors"
                    >
                      {carModel}
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </>
            );
          })()}
          <span className="text-blue-600">{product.name}</span>
        </div>
      </div>

      {/* Product Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images - 360° Slider */}
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <ImageSlider360 
                images={testImages}
                productName="360° Test View"
              />
            </motion.div>

            {/* Features Grid */}
            <motion.div 
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {features.map((feature, index) => (
                <div key={index} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600">
                      {feature.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{feature.text}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Product Info */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div>
              <h1 className="text-4xl font-bold mb-6 text-gray-900">
                {product.name}
              </h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < Math.floor(product.averageRating || 0) ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <span className="text-gray-600">({product.totalReviews || 0} recenzii)</span>
              <span className={`font-semibold ${product.stock > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {product.stock > 0 ? 'În stoc' : 'Stoc epuizat'}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-gray-900">{product.price} lei</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-xl text-gray-500 line-through">{product.originalPrice} lei</span>
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    -{product.discount}%
                  </span>
                </>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border border-gray-200 rounded">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-50 transition text-gray-700"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-semibold text-gray-900">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-gray-50 transition text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`flex-1 py-3 px-6 rounded font-semibold transition ${
                  product.stock > 0 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                {product.stock > 0 ? 'Adaugă în coș' : 'Indisponibil'}
              </button>
              <button className="p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition">
                <Heart className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                <Truck className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Livrare gratuită</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                <Shield className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">3 ani garanție</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                <Check className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-gray-600">Instalare inclusă</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Product Tabs */}
        <motion.div 
          className="mt-16"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="flex gap-6 border-b border-gray-200 mb-8">
            {['description', 'specs', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`pb-4 px-2 font-semibold transition ${
                  selectedTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {tab === 'description' && 'Descriere'}
                {tab === 'specs' && 'Specificații'}
                {tab === 'reviews' && 'Recenzii'}
              </button>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-8 border border-gray-100">
            {selectedTab === 'description' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-medium mb-4 text-gray-900">Descriere produs</h3>
                <p className="text-gray-700 leading-relaxed">
                  {product.description}
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-blue-600">Caracteristici principale:</h4>
                    <ul className="space-y-2 text-gray-700">
                      {product.features && product.features.map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-blue-600">În cutie:</h4>
                    <ul className="space-y-2 text-gray-700">
                      {product.inTheBox && product.inTheBox.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'specs' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-medium mb-4 text-gray-900">Specificații tehnice</h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {product.specifications && product.specifications.slice(0, Math.ceil(product.specifications.length / 2)).map((spec, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">{spec.key}:</span>
                        <span className="text-gray-900">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {product.specifications && product.specifications.slice(Math.ceil(product.specifications.length / 2)).map((spec, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">{spec.key}:</span>
                        <span className="text-gray-900">{spec.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Garanție:</span>
                      <span className="text-gray-900">{product.warranty} luni</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-medium text-gray-900">Recenzii clienți</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-blue-600">4.8</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-blue-600 text-blue-600" />
                      ))}
                    </div>
                    <span className="text-gray-600">(127 recenzii)</span>
                  </div>
                </div>
                <div className="space-y-6">
                  {reviews.map((review, index) => (
                    <div key={index} className="bg-white rounded-lg p-6 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center font-medium text-blue-600">
                            {review.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{review.name}</h4>
                            <p className="text-sm text-gray-500">{review.date}</p>
                          </div>
                        </div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700">{review.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Image Gallery Modal */}
      {showImageGallery && product.images && product.images.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex flex-col">
            {/* Top Control Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4">
              <div className="text-white text-lg font-medium">
                {product.name}
              </div>
              <button
                onClick={closeImageGallery}
                className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-colors flex-shrink-0"
                title="Close Gallery (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => navigateGallery('prev')}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-colors"
                  title="Previous Image (←)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigateGallery('next')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-colors"
                  title="Next Image (→)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Main Image Container */}
            <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-32">
              <img
                src={product.images[galleryImageIndex]?.url}
                alt={product.images[galleryImageIndex]?.alt || product.name}
                className="max-w-full max-h-full object-contain"
                style={{
                  maxHeight: 'calc(100vh - 200px)',
                  maxWidth: 'calc(100vw - 32px)'
                }}
              />
            </div>

            {/* Bottom Control Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-black bg-opacity-80 p-4">
              {/* Image Counter */}
              <div className="text-center text-white text-sm mb-4">
                {galleryImageIndex + 1} of {product.images.length}
              </div>

              {/* Thumbnail Navigation */}
              {product.images.length > 1 && (
                <div className="flex justify-center">
                  <div className="flex space-x-2 overflow-x-auto max-w-full px-2">
                    {product.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setGalleryImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition ${
                          galleryImageIndex === index
                            ? 'border-white'
                            : 'border-gray-500 opacity-60 hover:opacity-80 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.alt || product.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Click outside to close */}
            <div 
              className="absolute inset-0 z-0"
              onClick={closeImageGallery}
            />
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link to="/" className="logo-link inline-block mb-4">
                <img 
                  src={logoSvg} 
                  alt="PilotOn - Navigații auto moderne"
                  className="logo-footer"
                />
              </Link>
              <p className="text-gray-600 text-sm mb-4">
                Navigații auto moderne și fiabile pentru toate mărcile.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-4">Produse</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Navigații GPS</a></li>
                <li><a href="#" className="hover:text-blue-600">CarPlay/Android Auto</a></li>
                <li><a href="#" className="hover:text-blue-600">Camere marsarier</a></li>
                <li><a href="#" className="hover:text-blue-600">Accesorii</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-4">Servicii</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Instalare</a></li>
                <li><a href="#" className="hover:text-blue-600">Service</a></li>
                <li><a href="#" className="hover:text-blue-600">Garanție</a></li>
                <li><a href="#" className="hover:text-blue-600">Suport</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-blue-600" />
                  <span>0800 123 456</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                  <span>contact@piloton.ro</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <p>© 2024 PilotOn. Toate drepturile rezervate.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-blue-600">Termeni</a>
              <a href="#" className="hover:text-blue-600">Confidențialitate</a>
              <a href="#" className="hover:text-blue-600">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductPageExperimental;
