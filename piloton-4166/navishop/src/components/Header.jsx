import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import logoSvg from '../logo.svg';
import { 
  Search, Menu, User, ShoppingCart, ChevronDown
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
                  <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                    <span>Produse</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <a href="#" className="text-gray-700 hover:text-blue-600">Reduceri</a>
                  <a href="#" className="text-gray-700 hover:text-blue-600">Service</a>
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
            <a href="#" className="block py-2 text-gray-700 hover:text-blue-600">Produse</a>
            <a href="#" className="block py-2 text-gray-700 hover:text-blue-600">Reduceri</a>
            <a href="#" className="block py-2 text-gray-700 hover:text-blue-600">Service</a>
            <Link to="/track-order" className="block py-2 text-gray-700 hover:text-blue-600">Urmărește comanda</Link>
            <Link to="/contact" className="block py-2 text-gray-700 hover:text-blue-600">Contact</Link>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;