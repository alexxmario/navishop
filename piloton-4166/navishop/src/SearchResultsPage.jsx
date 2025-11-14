import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import apiService from './services/api';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import RecentlyViewed from './components/RecentlyViewed';
import ProductCard from './components/ProductCard';
import {
  Search, Star, Heart, Filter, Grid, List, ArrowLeft,
  Phone, Mail
} from 'lucide-react';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { getCartItemsCount, addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    priceRange: '',
    brand: '',
    inStock: false
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (query) {
      searchProducts(query);
    }
  }, [query]);

  const searchProducts = async (searchQuery) => {
    try {
      setLoading(true);
      const response = await apiService.getProducts({ search: searchQuery });
      const searchResults = response.products || response || [];
      setProducts(searchResults);
      
      // Extract unique brands from search results
      const uniqueBrands = [...new Set(searchResults.map(p => p.brand).filter(Boolean))];
      setBrands(uniqueBrands);
    } catch (error) {
      console.error('Search failed:', error);
      setProducts([]);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };


  const filteredProducts = products.filter(product => {
    if (filters.brand && product.brand !== filters.brand) return false;
    if (filters.inStock && product.stock === 0) return false;
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
      case 'newest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      default: return (b.totalReviews || 0) - (a.totalReviews || 0); // popular
    }
  });


  return (
    <div className="min-h-screen bg-white">
      <PageTitle title={`Rezultate pentru "${query}"`} />
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-blue-600">Acasă</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Rezultate căutare</span>
          </div>
        </div>
      </div>

      {/* Search Results Header */}
      <div className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-4">
            <Link to="/" className="text-gray-600 hover:text-blue-600 mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-light text-gray-900">
              Rezultate pentru: <span className="font-medium">"{query}"</span>
            </h1>
          </div>
          <p className="text-gray-600 mb-2">
            {loading ? 'Se caută...' : `Produse care conțin "${query}"`}
          </p>
          <p className="text-sm text-gray-500">
            {loading ? 'Se încarcă rezultatele...' : `${sortedProducts.length} produse găsite`}
          </p>
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
              {brands.length > 0 && (
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
                onClick={() => setFilters({priceRange: '', brand: '', inStock: false})}
                className="w-full py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Șterge filtrele
              </button>
            </div>
          </div>

          {/* Products */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Se caută produsele...</p>
              </div>
            ) : (
              <>
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
                      <ProductCard key={product._id} product={product} viewMode={viewMode} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-12 h-12 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-light text-gray-900 mb-4">Nu am găsit rezultate</h2>
                    <p className="text-gray-600 mb-8">
                      Încearcă să cauți cu alți termeni sau navighează prin categoriile noastre.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={() => setFilters({priceRange: '', brand: '', inStock: false})}
                        className="px-6 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Șterge toate filtrele
                      </button>
                      <Link
                        to="/"
                        className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Înapoi la pagina principală
                      </Link>
                    </div>
                  </div>
                )}
              </>
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

export default SearchResultsPage;