import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
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
  const { getCartItemsCount } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    priceRange: '',
    brand: '',
    inStock: false
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [category]);

  const categoryData = {
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

  const products = [
    {
      id: 1,
      name: 'Navigație GPS Android 2024 Pro',
      compatibility: 'Universal - Toate mărcile',
      price: 1299,
      oldPrice: 1599,
      rating: 4.8,
      reviews: 156,
      badge: 'Bestseller',
      inStock: true,
      category: 'navigatii-gps',
      brand: 'TechAuto'
    },
    {
      id: 2,
      name: 'Sistem Multimedia CarPlay Premium',
      compatibility: 'BMW, Audi, Mercedes',
      price: 2199,
      oldPrice: 2499,
      rating: 4.9,
      reviews: 89,
      badge: 'Nou',
      inStock: true,
      category: 'carplay-android',
      brand: 'ProNav'
    },
    {
      id: 3,
      name: 'Navigație Touchscreen 7" HD',
      compatibility: 'Volkswagen, Skoda, Seat',
      price: 899,
      oldPrice: 1099,
      rating: 4.7,
      reviews: 203,
      badge: '-20%',
      inStock: false,
      category: 'navigatii-gps',
      brand: 'AutoTech'
    },
    {
      id: 4,
      name: 'GPS Premium cu Camere Integrate',
      compatibility: 'Toyota, Honda, Mazda',
      price: 1799,
      oldPrice: 2199,
      rating: 4.6,
      reviews: 124,
      badge: 'Reducere',
      inStock: true,
      category: 'navigatii-gps',
      brand: 'NaviPro'
    },
    {
      id: 5,
      name: 'Cameră Marsarier HD Wireless',
      compatibility: 'Universal',
      price: 349,
      oldPrice: 449,
      rating: 4.5,
      reviews: 78,
      badge: null,
      inStock: true,
      category: 'camere-marsarier',
      brand: 'CamTech'
    },
    {
      id: 6,
      name: 'Sistem CarPlay Wireless',
      compatibility: 'iPhone compatibil',
      price: 1599,
      oldPrice: 1899,
      rating: 4.8,
      reviews: 145,
      badge: 'Popular',
      inStock: true,
      category: 'carplay-android',
      brand: 'WirelessTech'
    }
  ];

  const currentCategory = categoryData[category] || {
    name: 'Produse',
    description: 'Toate produsele disponibile',
    count: products.length
  };

  const filteredProducts = products.filter(product => {
    if (category && category !== 'toate' && product.category !== category) return false;
    if (filters.brand && product.brand !== filters.brand) return false;
    if (filters.inStock && !product.inStock) return false;
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
      case 'rating': return b.rating - a.rating;
      case 'newest': return b.id - a.id;
      default: return b.reviews - a.reviews; // popular
    }
  });

  const brands = [...new Set(products.map(p => p.brand))];

  const ProductCard = ({ product }) => (
    <div className={`bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-200 group ${
      viewMode === 'list' ? 'flex' : ''
    }`}>
      <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
        <Link to={`/product/${product.id}`} className="block">
          <div className={`bg-gray-50 flex items-center justify-center ${
            viewMode === 'list' ? 'w-48 h-32' : 'w-full h-48'
          }`}>
            <div className="w-16 h-16 bg-blue-100 rounded border border-blue-200"></div>
          </div>
        </Link>
        {product.badge && (
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 text-xs font-medium ${
              product.badge === 'Bestseller' ? 'bg-blue-600 text-white' :
              product.badge === 'Nou' ? 'bg-black text-white' :
              product.badge === 'Popular' ? 'bg-green-600 text-white' :
              'bg-blue-600 text-white'
            }`}>
              {product.badge}
            </span>
          </div>
        )}
        <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Heart className="w-5 h-5 text-gray-400 hover:text-blue-600" />
        </button>
      </div>
      
      <div className="p-4 flex-1">
        <Link to={`/product/${product.id}`} className="block">
          <h3 className="font-medium text-gray-900 mb-1 hover:text-blue-600 transition-colors">{product.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{product.compatibility}</p>
        </Link>
        
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} />
            ))}
          </div>
          <span className="text-xs text-gray-600 ml-2">({product.reviews})</span>
        </div>
        
        <div className={`flex items-center justify-between mb-4 ${viewMode === 'list' ? 'flex-col items-start space-y-2' : ''}`}>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900">{product.price} lei</span>
            {product.oldPrice && (
              <span className="text-sm text-gray-500 line-through">{product.oldPrice} lei</span>
            )}
          </div>
          <span className={`text-xs ${product.inStock ? 'text-blue-600' : 'text-red-600'}`}>
            {product.inStock ? 'În stoc' : 'Stoc epuizat'}
          </span>
        </div>
        
        <button 
          className={`w-full py-2 text-sm font-medium transition-colors ${
            product.inStock 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-100 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!product.inStock}
        >
          {product.inStock ? 'Adaugă în coș' : 'Indisponibil'}
        </button>
      </div>
    </div>
  );

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
                onClick={() => setFilters({priceRange: '', brand: '', inStock: false})}
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
            {sortedProducts.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }>
                {sortedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Nu au fost găsite produse care să corespundă criteriilor selectate.</p>
                <button 
                  onClick={() => setFilters({priceRange: '', brand: '', inStock: false})}
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