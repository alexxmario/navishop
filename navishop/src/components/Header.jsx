import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import logoSvg from '../logo.svg';
import {
  Search, Menu, User, ShoppingCart, ChevronDown
} from 'lucide-react';

const categories = [
  { id: 'navigatii-gps', name: 'Navigații GPS', icon: '🧭' },
  { id: 'carplay-android', name: 'CarPlay / Android Auto', icon: '📱' },
  { id: 'module-carplay', name: 'Module CarPlay', icon: '🔌' },
  { id: 'camere-marsarier', name: 'Camere Marsarier', icon: '📷' },
  { id: 'dvr', name: 'DVR', icon: '🎥' },
  { id: 'sisteme-multimedia', name: 'Sisteme Multimedia', icon: '🎵' },
  { id: 'portbagaj-electric', name: 'Portbagaj Electric', icon: '🚗' },
  { id: 'lumini-ambientale', name: 'Lumini Ambientale', icon: '💡' },
  { id: 'accesorii', name: 'Accesorii', icon: '🔧' },
];

const Header = ({
  showNavigation = true,
  showSearch = true,
  className = ""
}) => {
  const { isAuthenticated } = useAuth();
  const { getCartItemsCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProductsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      <header className={`main-header border-b border-gray-100 sticky top-0 z-50 bg-white ${className}`}>
        <div className="container mx-auto px-4">
          <div className="header-content">
            {/* Logo */}
            <div className="logo-container">
              <Link to="/" className="logo-link">
                <img
                  src={logoSvg}
                  alt="PilotOn - Navigații auto moderne"
                  className="logo-header"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            {showNavigation && (
              <div className="nav-container">
                <nav className="hidden md:flex items-center space-x-8">
                  {/* Products Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                      className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
                    >
                      Produse
                      <ChevronDown className={`w-4 h-4 transition-transform ${isProductsDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProductsDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 shadow-lg rounded-lg py-2 z-50">
                        {categories.map((category) => (
                          <Link
                            key={category.id}
                            to={`/category/${category.id}`}
                            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setIsProductsDropdownOpen(false)}
                          >
                            <span className="text-lg">{category.icon}</span>
                            <span>{category.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link to="/reduceri" className="text-gray-700 hover:text-blue-600">Reduceri</Link>
                  <Link
                    to="/category/gps"
                    className="relative inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300"
                    style={{
                      boxShadow: '0 0 15px rgba(251, 191, 36, 0.5), 0 0 25px rgba(249, 115, 22, 0.3)',
                      animation: 'gps-shine 3s ease-in-out infinite'
                    }}
                  >
                    <span className="text-lg">🚛</span>
                    <span className="relative z-10 tracking-wide">GPS Camion</span>
                  </Link>
                  <Link to="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
                </nav>

                {/* Desktop Search Bar */}
                {showSearch && (
                  <div className="hidden md:flex flex-1 max-w-md mx-8">
                    <form onSubmit={handleSearchSubmit} className="relative w-full">
                      <input
                        type="text"
                        placeholder="Caută navigații auto..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* User Actions */}
            <div className="actions-container">
              <div className="flex items-center space-x-4">
                <Link
                  to={isAuthenticated() ? "/dashboard" : "/login"}
                  className={`${isAuthenticated() ? "text-blue-600 hover:text-blue-700" : "text-gray-700 hover:text-blue-600"}`}
                >
                  <User className="w-5 h-5" />
                </Link>
                <Link to="/cart" className="relative text-gray-700 hover:text-blue-600">
                  <ShoppingCart className="w-5 h-5" />
                  {getCartItemsCount() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {getCartItemsCount()}
                    </span>
                  )}
                </Link>
                {/* Mobile GPS Button - visible only on mobile */}
                {showNavigation && (
                  <Link
                    to="/category/gps"
                    className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white font-bold rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                    style={{
                      boxShadow: '0 0 10px rgba(251, 191, 36, 0.4)',
                      animation: 'gps-shine 3s ease-in-out infinite'
                    }}
                  >
                    <span className="text-sm">🚛</span>
                    <span className="text-xs tracking-wide">GPS Camion</span>
                  </Link>
                )}
                {showNavigation && (
                  <button
                    className="text-gray-700 hover:text-blue-600 md:hidden"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search Bar - Always visible on mobile/tablet */}
          {showSearch && (
            <div className="md:hidden pb-3">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  placeholder="Caută navigații auto..."
                  className="w-full pl-10 pr-20 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Caută
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {showNavigation && isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100">
          <div className="px-4 py-2 space-y-2">
            {/* Mobile Products Dropdown */}
            <div>
              <button
                onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                className="flex items-center justify-between py-2 text-left w-full text-gray-700 hover:text-blue-600"
              >
                <span>Produse</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isProductsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isProductsDropdownOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/category/${category.id}`}
                      className="flex items-center gap-2 py-2 text-gray-600 hover:text-blue-600"
                      onClick={() => { setIsMenuOpen(false); setIsProductsDropdownOpen(false); }}
                    >
                      <span>{category.icon}</span>
                      <span className="text-sm">{category.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to="/reduceri" className="block py-2 text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Reduceri</Link>
            <Link to="/contact" className="block py-2 text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Contact</Link>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
