import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import apiService from './services/api';
import Footer from './components/Footer';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import RecentlyViewed from './components/RecentlyViewed';
import ZoomImage from './components/ZoomImage';
import {
  Star, Heart, Filter, Grid, List, ArrowLeft, X, SlidersHorizontal
} from 'lucide-react';

const CategoryPage = () => {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getCartItemsCount, addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    priceRange: '',
    brand: '',
    inStock: false,
    subcategory: ''
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    loadProducts();

    // Read subcategory from URL parameter
    const subcategoryParam = searchParams.get('subcategory');
    if (subcategoryParam) {
      setFilters(prev => ({ ...prev, subcategory: subcategoryParam }));
    }
  }, [category, searchParams]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      // Build query params - include subcategory if present in URL
      const params = { category, status: 'active', limit: 200 };
      const subcategoryParam = searchParams.get('subcategory');
      if (subcategoryParam) {
        params.subcategory = subcategoryParam;
      }

      const data = await apiService.getProducts(params);
      // API returns { products, pagination, filters } - extract the products array
      setProducts(data.products || data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const categoryData = {
    'gps': {
      name: 'GPS',
      description: 'Sisteme GPS portabile pentru TIR, camioane și autoturisme. Ecrane 5", 7", 9" și Android.',
      count: 15
    },
    'navigatii-gps': {
      name: 'Navigații GPS',
      description: 'Sisteme de navigație GPS moderne și fiabile pentru toate mărcile de mașini',
      count: 45
    },
    'carplay-android': {
      name: 'CarPlay & Android Auto',
      description: 'Sisteme multimedia cu suport CarPlay și Android Auto',
      count: 32
    },
    'camere-marsarier': {
      name: 'Camere Marsarier',
      description: 'Camere pentru parcarea în siguranță',
      count: 28
    },
    'accesorii': {
      name: 'Accesorii',
      description: 'Accesorii și componente pentru sistemele de navigație',
      count: 67
    }
  };


  const currentCategory = categoryData[category] || {
    name: 'Produse',
    description: 'Toate produsele disponibile',
    count: products.length
  };

  // Backend already filters by subcategory, so we only filter by client-side filters
  const filteredProducts = products.filter(product => {
    if (filters.brand && product.brand !== filters.brand) return false;
    if (filters.inStock && product.stock <= 0) return false;
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (product.price < min || (max && product.price > max)) return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'rating': return (b.averageRating || 0) - (a.averageRating || 0);
      case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
      default: return (b.totalReviews || 0) - (a.totalReviews || 0); // popular
    }
  });

  const brands = [...new Set(products.map(p => p.brand))];

  const ProductCard = ({ product }) => {
    const primaryImage = product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url;
    const isInStock = product.stock > 0;
    const showBadge = product.onSale || product.featured || product.newProduct;
    const badge = product.onSale ? `-${product.discount}%` : product.featured ? 'Bestseller' : product.newProduct ? 'Nou' : null;

    return (
      <div className={`bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-md transition-all duration-200 group flex ${
        viewMode === 'list' ? 'flex-row' : 'flex-col'
      }`}>
        <div className={`relative ${viewMode === 'list' ? 'w-28 sm:w-48 flex-shrink-0' : ''}`}>
          <Link to={`/product/${product.slug}`} className="block">
            <div className={`bg-gray-50 rounded-t-xl ${viewMode === 'list' ? 'rounded-l-xl rounded-tr-none' : ''} flex items-center justify-center overflow-hidden ${
              viewMode === 'list' ? 'w-28 h-28 sm:w-48 sm:h-32' : 'w-full h-40 sm:h-48'
            }`}>
              {primaryImage ? (
                <ZoomImage
                  src={primaryImage}
                  imageCount={product.images?.length}
                  alt={product.name}
                  className="w-full h-full object-center"
                  zoomClass="object-cover scale-[1.5]"
                  noZoomClass="object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded border border-blue-200"></div>
              )}
            </div>
          </Link>
          {showBadge && badge && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
              <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium rounded ${
                product.onSale ? 'bg-red-600 text-white' :
                product.featured ? 'bg-blue-600 text-white' :
                'bg-black text-white'
              }`}>
                {badge}
              </span>
            </div>
          )}
          <button aria-label="Adaugă la favorite" className="hidden sm:block absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Heart className="w-5 h-5 text-gray-400 hover:text-blue-600" />
          </button>
        </div>

        <div className="p-3 sm:p-4 flex-1 flex flex-col">
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1 line-clamp-2 leading-snug hover:text-blue-600 transition-colors">{product.name}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{product.brand}</p>
          </Link>

          <div className="hidden sm:flex items-center mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.averageRating || 0) ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-xs text-gray-600 ml-2">({product.totalReviews || 0})</span>
          </div>

          <div className={`mt-auto flex items-end justify-between gap-2 mb-3 sm:mb-4 ${viewMode === 'list' ? 'sm:flex-col sm:items-start sm:gap-2' : ''}`}>
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="text-sm sm:text-base font-semibold text-gray-900">{product.price.toFixed(2)} RON</span>
              {product.originalPrice && (
                <span className="text-xs text-gray-500 line-through">{product.originalPrice.toFixed(2)} RON</span>
              )}
            </div>
            <span className={`text-[11px] sm:text-xs whitespace-nowrap ${isInStock ? 'text-blue-600' : 'text-red-600'}`}>
              {isInStock ? 'În stoc' : 'Epuizat'}
            </span>
          </div>

          <button
            onClick={() => isInStock && addToCart(product)}
            className={`w-full py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              isInStock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!isInStock}
          >
            {isInStock ? 'Adaugă în coș' : 'Indisponibil'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <PageTitle title={currentCategory.name} />
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-blue-600">Acasă</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{currentCategory.name}</span>
          </div>
        </div>
      </div>

      {/* Category Header */}
      <div className="py-8 sm:py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-3 sm:mb-4">
            <Link to="/" className="text-gray-600 hover:text-blue-600 mr-3 sm:mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-light text-gray-900">{currentCategory.name}</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mb-2">{currentCategory.description}</p>
          <p className="text-sm text-gray-500">{sortedProducts.length} produse găsite</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filters Sidebar - drawer on mobile, sticky column on desktop */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-64 flex-shrink-0`}>
            <div className="bg-white border border-gray-100 rounded-xl p-5 sm:p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <span className="font-medium">Filtre</span>
                <button onClick={() => setShowFilters(false)} aria-label="Închide filtrele" className="p-1 text-gray-500 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="font-medium mb-4 hidden lg:flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtrează
              </h3>
              
              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Preț</label>
                <select 
                  className="w-full p-2 border border-gray-200 text-sm focus:outline-none focus:border-blue-600"
                  value={filters.priceRange}
                  onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
                >
                  <option value="">Toate prețurile</option>
                  <option value="0-500">Sub 500 lei</option>
                  <option value="500-1000">500 - 1000 lei</option>
                  <option value="1000-1500">1000 - 1500 lei</option>
                  <option value="1500-2000">1500 - 2000 lei</option>
                  <option value="2000">Peste 2000 lei</option>
                </select>
              </div>

              {/* Brand */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Marcă</label>
                <select
                  className="w-full p-2 border border-gray-200 text-sm focus:outline-none focus:border-blue-600"
                  value={filters.brand}
                  onChange={(e) => setFilters({...filters, brand: e.target.value})}
                >
                  <option value="">Toate mărcile</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Screen Size Filter - GPS category only */}
              {category === 'gps' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Mărime ecran</label>
                  <select
                    className="w-full p-2 border border-gray-200 text-sm focus:outline-none focus:border-blue-600"
                    value={searchParams.get('subcategory') || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        navigate(`/category/${category}?subcategory=${value}`);
                      } else {
                        navigate(`/category/${category}`);
                      }
                    }}
                  >
                    <option value="">Toate mărimile</option>
                    <option value="5-inch">5 inch</option>
                    <option value="7-inch">7 inch</option>
                    <option value="9-inch">9 inch</option>
                    <option value="android">Android</option>
                  </select>
                </div>
              )}

              {/* In Stock */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) => setFilters({...filters, inStock: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Doar produse în stoc</span>
                </label>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => setFilters({priceRange: '', brand: '', inStock: false, subcategory: ''})}
                className="w-full py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Șterge filtrele
              </button>
            </div>
          </div>

          {/* Products */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtre
              </button>

              <select
                className="flex-1 lg:flex-none p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popular">Cele mai populare</option>
                <option value="price-low">Preț crescător</option>
                <option value="price-high">Preț descrescător</option>
                <option value="rating">Cel mai bine cotate</option>
                <option value="newest">Cele mai noi</option>
              </select>

              <div className="hidden sm:flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Vizualizare grilă"
                  className={`p-2 border rounded-lg ${viewMode === 'grid' ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="Vizualizare listă"
                  className={`p-2 border rounded-lg ${viewMode === 'list' ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Products Grid/List */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Se încarcă produsele...</p>
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6'
                : 'space-y-4'
              }>
                {sortedProducts.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Nu au fost găsite produse care să corespundă criteriilor selectate.</p>
                <button
                  onClick={() => setFilters({priceRange: '', brand: '', inStock: false, subcategory: ''})}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Șterge toate filtrele
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recently Viewed */}
      <RecentlyViewed />

      <Footer />
    </div>
  );
};

export default CategoryPage;