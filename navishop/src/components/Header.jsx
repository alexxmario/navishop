import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import logoSvg from '../logo.svg';
import {
  Search, Menu, User, ShoppingCart, ChevronDown, X, Truck
} from 'lucide-react';

const categories = [
  { id: 'navigatii-gps', name: 'Navigații GPS' },
  { id: 'carplay-android', name: 'CarPlay / Android Auto' },
  { id: 'module-carplay', name: 'Module CarPlay' },
  { id: 'camere-marsarier', name: 'Camere Marsarier' },
  { id: 'portbagaj-electric', name: 'Portbagaj Electric' },
  { id: 'lumini-ambientale', name: 'Lumini Ambientale' },
  { id: 'accesorii', name: 'Accesorii' },
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
                            <span>{category.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link to="/reduceri" className="text-gray-700 hover:text-blue-600">Reduceri</Link>
                  <Link
                    to="/category/gps"
                    className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                  >
                    GPS Camion
                  </Link>
                  <Link to="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
                  <Link to="/b2b" className="text-gray-700 hover:text-blue-600">Cont B2B</Link>
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
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to={isAuthenticated() ? "/dashboard" : "/login"}
                  aria-label="Contul meu"
                  className={`p-2 rounded-lg transition-colors ${isAuthenticated() ? "text-blue-600 hover:bg-blue-50" : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"}`}
                >
                  <User className="w-5 h-5" />
                </Link>
                <Link
                  to="/cart"
                  aria-label="Coșul de cumpărături"
                  className="relative p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {getCartItemsCount() > 0 && (
                    <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-semibold rounded-full min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center">
                      {getCartItemsCount()}
                    </span>
                  )}
                </Link>
                {showNavigation && (
                  <button
                    aria-label="Meniu"
                    className="p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors md:hidden"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                  className="w-full pl-11 pr-20 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
        <div className="md:hidden bg-white border-b border-gray-100 shadow-lg">
          <nav className="px-4 py-3 space-y-1">
              {/* Categories */}
              <p className="px-1 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Categorii</p>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.id}`}
                  className="block px-3 py-2.5 rounded-lg text-[15px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}

              <div className="h-px bg-gray-100 my-2" />

              <Link to="/reduceri" className="block px-3 py-2.5 rounded-lg text-[15px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Reduceri</Link>
              <Link to="/contact" className="block px-3 py-2.5 rounded-lg text-[15px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              <Link to="/b2b" className="block px-3 py-2.5 rounded-lg text-[15px] text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Cont B2B</Link>

              <Link
                to="/category/gps"
                className="mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Truck className="w-4 h-4" />
                GPS Camion
              </Link>
          </nav>
        </div>
      )}
    </>
  );
};

export default Header;
