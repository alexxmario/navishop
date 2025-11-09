import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import { useRecentlyViewed } from './RecentlyViewedContext';
import apiService from './services/api';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import RecentlyViewed from './components/RecentlyViewed';
import Header from './components/Header';
import ReviewsList from './components/ReviewsList';
import {
  Search, ShoppingCart, Star, Heart, ChevronRight, Truck, Shield, Check, Phone, Mail,
  Minus, Plus, ArrowLeft, Bluetooth, Smartphone, MapPin, Zap,
  X, ChevronLeft
} from 'lucide-react';

const ProductPage = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedTab, setSelectedTab] = useState('description');
  const [searchQuery, setSearchQuery] = useState('');
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [crossSellProducts, setCrossSellProducts] = useState([]);

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
    
    // Extract model WITH years (everything before specs like inch, GB, CORE)
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
        // Include BOTH model and years for complete model name
        model = `${match[1].trim()} ${match[2].trim()}`;
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

  const fetchReviewStats = async (productId) => {
    try {
      const stats = await apiService.request(`/reviews/stats/${productId}`);
      setReviewStats(stats);
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
    }
  };

  const fetchCrossSellProducts = async (productId) => {
    try {
      const data = await apiService.request(`/products/${productId}/cross-sell`);
      setCrossSellProducts(data.crossSellProducts || []);

      // Log the bidirectional relationships for debugging
      if (data.directCrossSells > 0 || data.reverseCrossSells > 0) {
        console.log(`Cross-sell relationships: ${data.directCrossSells} direct + ${data.reverseCrossSells} reverse = ${data.totalCrossSells} total`);
      }
    } catch (error) {
      console.error('Failed to fetch cross-sell products:', error);
    }
  };

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
        // Fetch real review stats and cross-sell products
        fetchReviewStats(product._id);
        fetchCrossSellProducts(product._id);
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


  // Create 4 key features (excluding WiFi Integrat and Cameră Marsarier)
  const getProductFeatures = () => {
    const features = [];

    // Add connectivity-based features (excluding WiFi)
    if (product.connectivityOptions) {
      if (product.connectivityOptions.some(opt => opt.toLowerCase().includes('bluetooth'))) {
        features.push({ icon: <Bluetooth className="w-5 h-5" />, text: 'Bluetooth' });
      }
      if (product.connectivityOptions.some(opt => opt.toLowerCase().includes('carplay') || opt.toLowerCase().includes('android auto'))) {
        features.push({ icon: <Smartphone className="w-5 h-5" />, text: 'CarPlay/Android Auto' });
      }
    }

    // Add tech-based features (excluding Cameră Marsarier)
    if (product.technicalFeatures) {
      if (product.technicalFeatures.some(feat => feat.toLowerCase().includes('gps') || feat.toLowerCase().includes('navigation'))) {
        features.push({ icon: <MapPin className="w-5 h-5" />, text: 'GPS Navigation' });
      }
      if (product.technicalFeatures.some(feat => feat.toLowerCase().includes('plug') && feat.toLowerCase().includes('play'))) {
        features.push({ icon: <Zap className="w-5 h-5" />, text: 'Plug & Play' });
      }
    }

    // Fallback to 4 key features (excluding WiFi Integrat and Cameră Marsarier)
    if (features.length === 0) {
      return [
        { icon: <Bluetooth className="w-5 h-5" />, text: 'Bluetooth' },
        { icon: <Smartphone className="w-5 h-5" />, text: 'Android Auto' },
        { icon: <MapPin className="w-5 h-5" />, text: 'GPS Navigation' },
        { icon: <Zap className="w-5 h-5" />, text: 'Instalare Rapidă' },
      ];
    }

    return features.slice(0, 4); // Show max 4 features
  };

  const features = getProductFeatures();


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
                      to={`/brands/${encodeURIComponent(carBrand.toLowerCase())}`} 
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
                      to={`/brands/${encodeURIComponent(carBrand.toLowerCase())}/${encodeURIComponent(carModel.toLowerCase())}`} 
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
          {/* Product Images */}
          <div className="space-y-4">
            <motion.div 
              className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center mb-4">
                {product.images && product.images.length > 0 ? (
                  <button 
                    onClick={() => openImageGallery(selectedImage)}
                    className="w-full group relative overflow-hidden rounded-lg"
                  >
                    <img 
                      src={product.images[selectedImage]?.url || product.images[0].url} 
                      alt={product.images[selectedImage]?.alt || product.name}
                      className="w-full h-80 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 rounded-full p-3 transition-opacity duration-300">
                        <Search className="w-6 h-6 text-gray-800" />
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="w-20 h-20 bg-blue-100 rounded border border-blue-200"></div>
                  </div>
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex justify-center gap-2">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-16 h-16 rounded border-2 overflow-hidden transition hover:scale-105 ${
                        selectedImage === index
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
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
              )}
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
                    className={`w-5 h-5 ${i < Math.floor(reviewStats.averageRating) ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-gray-600">
                {reviewStats.averageRating > 0 ? (
                  `${reviewStats.averageRating}/5 (${reviewStats.totalReviews} ${reviewStats.totalReviews === 1 ? 'recenzie' : 'recenzii'})`
                ) : (
                  'Fără recenzii'
                )}
              </span>
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
                {/* Display structured description if available */}
                {product.structuredDescription && product.structuredDescription.sections && product.structuredDescription.sections.length > 0 ? (
                  <div className="space-y-8">
                    {product.structuredDescription.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-blue-600 mb-4 flex items-center">
                          <span className="text-2xl mr-3">{section.icon}</span>
                          {section.title.replace(/[📦🚗📱📷🖥️🔊🗺️🎮⚙️]/g, '').trim()}
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            // Filter and combine connectivity-related points
                            const connectivityKeywords = ['Conectivitate 4G LTE și Wi-Fi 2.4G Hot', 'Oferă o conexiune rapidă și fiabilă 4G LTE', 'cu acoperire largă și performanță constantă', 'funcția Hot', 'Spot Wi-Fi 2.4G asigură'];
                            const connectivityPoints = [];
                            const otherPoints = [];

                            section.points.forEach((point) => {
                              const cleanPoint = point.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
                              const isConnectivity = connectivityKeywords.some(keyword => cleanPoint.includes(keyword));

                              if (isConnectivity) {
                                connectivityPoints.push(cleanPoint);
                              } else {
                                otherPoints.push(cleanPoint);
                              }
                            });

                            // Combine connectivity points into one
                            if (connectivityPoints.length > 0) {
                              const combinedText = "Conectivitate 4G LTE și Wi-Fi 2.4G Hot Spot Oferă o conexiune rapidă și fiabilă 4G LTE, cu acoperire largă și performanță constantă, iar funcția Hot Spot Wi-Fi 2.4G asigură o experiență online optimizată";
                              otherPoints.unshift(combinedText);
                            }

                            return otherPoints.map((point, pointIndex) => (
                              <div key={pointIndex} className="flex items-start">
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                <p className="text-gray-700 leading-relaxed">{point}</p>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Fallback to original description format */
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-600">Caracteristici principale:</h4>
                        <ul className="space-y-2 text-gray-700">
                          {product.technicalFeatures && product.technicalFeatures.length > 0 ?
                            product.technicalFeatures.slice(0, 10).map((feature, index) => (
                              <li key={index}>• {feature}</li>
                            )) :
                            product.features && product.features.map((feature, index) => (
                              <li key={index}>• {feature}</li>
                            ))
                          }
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-600">Conectivitate:</h4>
                        <ul className="space-y-2 text-gray-700">
                          {product.connectivityOptions && product.connectivityOptions.length > 0 ?
                            product.connectivityOptions.map((option, index) => (
                              <li key={index}>• {option}</li>
                            )) :
                            product.inTheBox && product.inTheBox.map((item, index) => (
                              <li key={index}>• {item}</li>
                            ))
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accesorii compatibile section */}
                {crossSellProducts.length > 0 && (
                  <div className="mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Accesorii compatibile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {crossSellProducts.map((accessory) => (
                        <Link
                          key={accessory._id}
                          to={`/product/${accessory.slug}`}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 group"
                        >
                          <div className="relative mb-4">
                            {accessory.images && accessory.images.length > 0 ? (
                              <img
                                src={accessory.images[0].url}
                                alt={accessory.images[0].alt || accessory.name}
                                className="w-full h-40 object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                                <div className="w-16 h-16 bg-blue-100 rounded border border-blue-200"></div>
                              </div>
                            )}
                            {accessory.discount > 0 && (
                              <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                                -{accessory.discount}%
                              </span>
                            )}
                          </div>

                          <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {accessory.name}
                          </h4>

                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < Math.floor(accessory.averageRating || 0) ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              ({accessory.totalReviews || 0})
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900">{accessory.price} lei</span>
                              {accessory.originalPrice && accessory.originalPrice > accessory.price && (
                                <span className="text-sm text-gray-500 line-through">{accessory.originalPrice} lei</span>
                              )}
                            </div>
                            <span className={`text-sm font-medium ${accessory.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {accessory.stock > 0 ? 'În stoc' : 'Stoc epuizat'}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'specs' && (
              <div className="space-y-8">

                {/* Romanian Hardware Specifications */}
                {product.romanianSpecs && (Object.keys(product.romanianSpecs.hardware || {}).length > 0 || Object.keys(product.romanianSpecs.display || {}).length > 0) && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-blue-600 border-b border-blue-100 pb-2">Specificații Hardware</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        {product.romanianSpecs.hardware?.modelProcesor && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Model Procesor:</span>
                            <span className="text-gray-900">{product.romanianSpecs.hardware.modelProcesor}</span>
                          </div>
                        )}
                        {product.romanianSpecs.hardware?.memorieRAM && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Memorie RAM:</span>
                            <span className="text-gray-900">{product.romanianSpecs.hardware.memorieRAM}</span>
                          </div>
                        )}
                        {product.romanianSpecs.hardware?.capacitateStocare && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Capacitate Stocare:</span>
                            <span className="text-gray-900">{product.romanianSpecs.hardware.capacitateStocare}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {product.romanianSpecs.display?.diagonalaDisplay && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Diagonala Display:</span>
                            <span className="text-gray-900">{product.romanianSpecs.display.diagonalaDisplay}</span>
                          </div>
                        )}
                        {product.romanianSpecs.display?.tehnologieDisplay && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Tehnologie Display:</span>
                            <span className="text-gray-900">{product.romanianSpecs.display.tehnologieDisplay}</span>
                          </div>
                        )}
                        {product.romanianSpecs.display?.rezolutieDisplay && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Rezoluție Display:</span>
                            <span className="text-gray-900">{product.romanianSpecs.display.rezolutieDisplay}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Romanian Features and Connectivity */}
                {product.romanianSpecs && (product.romanianSpecs.features || product.romanianSpecs.connectivity) && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-blue-600 border-b border-blue-100 pb-2">Funcții și Conectivitate</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        {product.romanianSpecs.features?.functii && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Funcții:</span>
                            <span className="text-gray-900">{product.romanianSpecs.features.functii}</span>
                          </div>
                        )}
                        {product.romanianSpecs.connectivity?.conectivitate && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Conectivitate:</span>
                            <span className="text-gray-900">{product.romanianSpecs.connectivity.conectivitate}</span>
                          </div>
                        )}
                        {product.romanianSpecs.connectivity?.bluetooth && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Bluetooth:</span>
                            <span className="text-gray-900">{product.romanianSpecs.connectivity.bluetooth}</span>
                          </div>
                        )}
                        {product.romanianSpecs.features?.splitScreen && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Split Screen:</span>
                            <span className="text-gray-900">{product.romanianSpecs.features.splitScreen}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {product.romanianSpecs.features?.preluareComenziVolan && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Preluare Comenzi Volan:</span>
                            <span className="text-gray-900">{product.romanianSpecs.features.preluareComenziVolan}</span>
                          </div>
                        )}
                        {product.romanianSpecs.features?.suportAplicatiiAndroid && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Suport Aplicații Android:</span>
                            <span className="text-gray-900">{product.romanianSpecs.features.suportAplicatiiAndroid}</span>
                          </div>
                        )}
                        {product.romanianSpecs.features?.limbiInterfata && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Limbi Interfață:</span>
                            <span className="text-gray-900">{product.romanianSpecs.features.limbiInterfata}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Romanian Compatibility and Package */}
                {product.romanianSpecs && (product.romanianSpecs.compatibility || product.romanianSpecs.package) && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-blue-600 border-b border-blue-100 pb-2">Compatibilitate și Pachet</h4>
                    <div className="space-y-3">
                      {product.romanianSpecs.compatibility?.marca && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">Marcă:</span>
                          <span className="text-gray-900">{product.romanianSpecs.compatibility.marca}</span>
                        </div>
                      )}
                      {product.romanianSpecs.compatibility?.destinatPentru && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">Destinat pentru:</span>
                          <span className="text-gray-900">{product.romanianSpecs.compatibility.destinatPentru}</span>
                        </div>
                      )}
                      {product.romanianSpecs.compatibility?.tipMontare && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">Tip Montare:</span>
                          <span className="text-gray-900">{product.romanianSpecs.compatibility.tipMontare}</span>
                        </div>
                      )}
                      {product.romanianSpecs.package?.continutPachet && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">Conținut Pachet:</span>
                          <p className="text-gray-900 mt-1">{product.romanianSpecs.package.continutPachet}</p>
                        </div>
                      )}
                      {product.romanianSpecs.package?.formateMediaSuportate && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">Formate Media Suportate:</span>
                          <p className="text-gray-900 mt-1">{product.romanianSpecs.package.formateMediaSuportate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Romanian General Specifications */}
                {product.romanianSpecs && product.romanianSpecs.general && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-blue-600 border-b border-blue-100 pb-2">Specificații Generale</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        {product.romanianSpecs.general.sku && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">SKU:</span>
                            <span className="text-gray-900">{product.romanianSpecs.general.sku}</span>
                          </div>
                        )}
                        {product.romanianSpecs.general.categorii && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Categorii:</span>
                            <span className="text-gray-900">{product.romanianSpecs.general.categorii}</span>
                          </div>
                        )}
                        {product.romanianSpecs.general.brand && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Brand:</span>
                            <span className="text-gray-900">{product.romanianSpecs.general.brand}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {product.romanianSpecs.general.sistemOperare && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Sistem de Operare:</span>
                            <span className="text-gray-900">{product.romanianSpecs.general.sistemOperare}</span>
                          </div>
                        )}
                        {product.romanianSpecs.general.harta && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Hartă:</span>
                            <span className="text-gray-900">{product.romanianSpecs.general.harta}</span>
                          </div>
                        )}
                        {product.romanianSpecs.general.tmc && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">TMC:</span>
                            <span className="text-gray-900">{product.romanianSpecs.general.tmc}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">Garanție:</span>
                          <span className="text-gray-900">{product.warranty} luni</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Romanian Additional Specifications (Limitări etc.) */}
                {product.romanianSpecs && product.romanianSpecs.additional && Object.keys(product.romanianSpecs.additional).length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-blue-600 border-b border-blue-100 pb-2">Informații Adiționale</h4>
                    <div className="space-y-3">
                      {product.romanianSpecs.additional.limitari && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">
                            <strong>Limitări:</strong>
                          </span>
                          <p className="text-gray-900 mt-1">{product.romanianSpecs.additional.limitari}</p>
                        </div>
                      )}
                      {product.romanianSpecs.additional.garantie && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">
                            <strong>Garanție:</strong>
                          </span>
                          <p className="text-gray-900 mt-1">{product.romanianSpecs.additional.garantie}</p>
                        </div>
                      )}
                      {product.romanianSpecs.additional.observatii && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">
                            <strong>Observații:</strong>
                          </span>
                          <p className="text-gray-900 mt-1">{product.romanianSpecs.additional.observatii}</p>
                        </div>
                      )}
                      {product.romanianSpecs.additional.note && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">
                            <strong>Note:</strong>
                          </span>
                          <p className="text-gray-900 mt-1">{product.romanianSpecs.additional.note}</p>
                        </div>
                      )}
                      {product.romanianSpecs.additional.mentiuni && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600 font-medium">
                            <strong>Mențiuni:</strong>
                          </span>
                          <p className="text-gray-900 mt-1">{product.romanianSpecs.additional.mentiuni}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fallback to Enhanced Specifications if Romanian not available */}
                {(!product.romanianSpecs || Object.keys(product.romanianSpecs).length === 0) && product.detailedSpecs && (Object.keys(product.detailedSpecs).length > 0 || Object.keys(product.displaySpecs || {}).length > 0) && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-blue-600 border-b border-blue-100 pb-2">Specificații Hardware</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        {product.detailedSpecs.processor && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Procesor:</span>
                            <span className="text-gray-900">{product.detailedSpecs.processor}</span>
                          </div>
                        )}
                        {product.detailedSpecs.ram && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">RAM:</span>
                            <span className="text-gray-900">{product.detailedSpecs.ram}</span>
                          </div>
                        )}
                        {product.detailedSpecs.storage && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Stocare:</span>
                            <span className="text-gray-900">{product.detailedSpecs.storage}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {product.displaySpecs?.screenSize && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Mărime ecran:</span>
                            <span className="text-gray-900">{product.displaySpecs.screenSize}</span>
                          </div>
                        )}
                        {product.displaySpecs?.technology && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Tehnologie display:</span>
                            <span className="text-gray-900">{product.displaySpecs.technology}</span>
                          </div>
                        )}
                        {product.displaySpecs?.resolution && (
                          <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium">Rezoluție:</span>
                            <span className="text-gray-900">{product.displaySpecs.resolution}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'reviews' && (
              <div>
                <ReviewsList
                  productId={product._id}
                  onReviewUpdate={() => fetchReviewStats(product._id)}
                />
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

export default ProductPage;