import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import apiService from './services/api';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import RecentlyViewed from './components/RecentlyViewed';
import {
  Star, Heart, Filter, Grid, List, ArrowLeft,
  Phone, Mail
} from 'lucide-react';

const CategoryPage = () => {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const { getCartItemsCount, addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
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
      const params = { category, status: 'active' };
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
      <div className={`bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-200 group ${
        viewMode === 'list' ? 'flex' : ''
      }`}>
        <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
          <Link to={`/product/${product.slug}`} className="block">
            <div className={`bg-gray-50 flex items-center justify-center overflow-hidden ${
              viewMode === 'list' ? 'w-48 h-32' : 'w-full h-48'
            }`}>
              {primaryImage ? (
                <img src={primaryImage} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded border border-blue-200"></div>
              )}
            </div>
          </Link>
          {showBadge && badge && (
            <div className="absolute top-3 left-3">
              <span className={`px-2 py-1 text-xs font-medium ${
                product.onSale ? 'bg-red-600 text-white' :
                product.featured ? 'bg-blue-600 text-white' :
                'bg-black text-white'
              }`}>
                {badge}
              </span>
            </div>
          )}
          <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Heart className="w-5 h-5 text-gray-400 hover:text-blue-600" />
          </button>
        </div>

        <div className="p-4 flex-1">
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-medium text-gray-900 mb-1 hover:text-blue-600 transition-colors">{product.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{product.brand}</p>
          </Link>

          <div className="flex items-center mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.averageRating || 0) ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-xs text-gray-600 ml-2">({product.totalReviews || 0})</span>
          </div>

          <div className={`flex items-center justify-between mb-4 ${viewMode === 'list' ? 'flex-col items-start space-y-2' : ''}`}>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">{product.price.toFixed(2)} RON</span>
              {product.originalPrice && (
                <span className="text-sm text-gray-500 line-through">{product.originalPrice.toFixed(2)} RON</span>
              )}
            </div>
            <span className={`text-xs ${isInStock ? 'text-blue-600' : 'text-red-600'}`}>
              {isInStock ? 'În stoc' : 'Stoc epuizat'}
            </span>
          </div>

          <button
            onClick={() => isInStock && addToCart(product)}
            className={`w-full py-2 text-sm font-medium transition-colors ${
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
      <div className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-4">
            <Link to="/" className="text-gray-600 hover:text-blue-600 mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-light text-gray-900">{currentCategory.name}</h1>
          </div>
          <p className="text-gray-600 mb-2">{currentCategory.description}</p>
          <p className="text-sm text-gray-500">{sortedProducts.length} produse găsite</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white border border-gray-100 p-6">
              <h3 className="font-medium mb-4 flex items-center">
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
                    value={filters.subcategory}
                    onChange={(e) => setFilters({...filters, subcategory: e.target.value})}
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <select 
                  className="p-2 border border-gray-200 text-sm focus:outline-none focus:border-blue-600"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="popular">Cele mai populare</option>
                  <option value="price-low">Preț crescător</option>
                  <option value="price-high">Preț descrescător</option>
                  <option value="rating">Cel mai bine cotate</option>
                  <option value="newest">Cele mai noi</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 border ${viewMode === 'grid' ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 border ${viewMode === 'list' ? 'border-blue-600 text-blue-600' : 'border-gray-200 text-gray-600'}`}
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
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-16">
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
                <li><Link to="/category/navigatii-gps" className="hover:text-blue-600">Navigații GPS</Link></li>
                <li><Link to="/category/carplay-android" className="hover:text-blue-600">CarPlay/Android Auto</Link></li>
                <li><Link to="/category/camere-marsarier" className="hover:text-blue-600">Camere marsarier</Link></li>
                <li><Link to="/category/accesorii" className="hover:text-blue-600">Accesorii</Link></li>
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

export default CategoryPage;