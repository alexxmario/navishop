import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import logoSvg from '../logo.svg';
import { 
  Search, Menu, User, ShoppingCart
} from 'lucide-react';

const Header = ({ 
  showNavigation = true, 
  showSearch = true, 
  className = "" 
}) => {
  const { isAuthenticated } = useAuth();
  const { getCartItemsCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleBrandsClick = (e) => {
    e.preventDefault();
    setIsMenuOpen(false);
    if (window.location.pathname === '/') {
      const section = document.getElementById('brands-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.location.href = '/#brands-section';
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
                  <button
                    onClick={handleBrandsClick}
                    className="text-gray-700 hover:text-blue-600"
                  >
                    Produse
                  </button>
                  <Link to="/reduceri" className="text-gray-700 hover:text-blue-600">Reduceri</Link>
                  <Link
                    to="/category/gps"
                    className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-black rounded-full shadow-2xl hover:shadow-[0_0_60px_rgba(251,191,36,0.8)] transform hover:scale-125 transition-all duration-300 border-2 border-yellow-300"
                    style={{
                      boxShadow: '0 0 30px rgba(251, 191, 36, 0.8), 0 0 60px rgba(249, 115, 22, 0.6), 0 0 90px rgba(239, 68, 68, 0.4), inset 0 0 25px rgba(255, 255, 255, 0.3)',
                      backgroundSize: '200% 100%',
                      animation: 'gps-shine 2s ease-in-out infinite, gps-pulse 1.5s ease-in-out infinite, gps-sparkle 3s linear infinite',
                      textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(251, 191, 36, 0.6)'
                    }}
                  >
                    <span className="text-xl animate-bounce">📍</span>
                    <span className="relative z-10 tracking-wider text-lg">GPS</span>
                    <span className="absolute -inset-2 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 rounded-full blur-md opacity-60 animate-pulse"></span>
                    <span className="absolute -inset-4 bg-gradient-to-r from-yellow-200 via-orange-300 to-red-300 rounded-full blur-xl opacity-30"></span>
                  </Link>
                  <Link to="/track-order" className="text-gray-700 hover:text-blue-600">Urmărește comanda</Link>
                  <Link to="/contact" className="text-gray-700 hover:text-blue-600">Contact</Link>
                </nav>

                {/* Search Bar */}
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
                {showSearch && (
                  <button className="text-gray-700 hover:text-blue-600 md:hidden">
                    <Search className="w-5 h-5" />
                  </button>
                )}
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
        </div>
      </header>

      {/* Mobile Menu */}
      {showNavigation && isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100">
          <div className="px-4 py-2 space-y-2">
            <button
              onClick={handleBrandsClick}
              className="block py-2 text-left w-full text-gray-700 hover:text-blue-600"
            >
              Produse
            </button>
            <Link to="/reduceri" className="block py-2 text-gray-700 hover:text-blue-600">Reduceri</Link>
            <Link
              to="/category/gps"
              className="block py-4 px-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white font-black rounded-xl shadow-2xl text-center border-2 border-yellow-300"
              style={{
                boxShadow: '0 0 30px rgba(251, 191, 36, 0.8), 0 0 50px rgba(249, 115, 22, 0.6)',
                animation: 'gps-pulse 1.5s ease-in-out infinite',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              📍 GPS PORTABILE
            </Link>
            <Link to="/track-order" className="block py-2 text-gray-700 hover:text-blue-600">Urmărește comanda</Link>
            <Link to="/contact" className="block py-2 text-gray-700 hover:text-blue-600">Contact</Link>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
