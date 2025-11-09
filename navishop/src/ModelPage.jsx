import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import apiService from './services/api';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import {
  ChevronRight, Star, Heart, Car, Filter,
  Grid, List, SortAsc, Calendar, Cpu, HardDrive
} from 'lucide-react';

const ModelPage = () => {
  const { brand, model } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart, getCartItemsCount } = useCart();
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Removed generation selection as generations are now separate models
  const [sortBy, setSortBy] = useState('name'); // name, price, specs
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  useEffect(() => {
    window.scrollTo(0, 0);
    loadModelData();
  }, [brand, model]);

  const loadModelData = async () => {
    try {
      setLoading(true);
      const data = await apiService.request(`/brands/${encodeURIComponent(brand)}/${encodeURIComponent(model)}`);

      if (data.success) {
        setModelData(data.data);
      } else {
        setError('Model not found');
      }
    } catch (error) {
      console.error('Failed to load model data:', error);
      setError('Failed to load model data');
    } finally {
      setLoading(false);
    }
  };

  const getProductsToShow = () => {
    if (!modelData?.products) return [];
    
    let products = [...modelData.products];
    
    // Sort products
    products.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    return products;
  };

  const extractSpecs = (productName) => {
    const specs = {};
    
    // Extract screen size
    const screenMatch = productName.match(/(\d+)\s*inch/i);
    if (screenMatch) {
      specs.screen = `${screenMatch[1]}"`;
    }
    
    // Extract RAM
    const ramMatch = productName.match(/(\d+)GB\s+(\d+)GB/);
    if (ramMatch) {
      specs.ram = `${ramMatch[1]}GB`;
      specs.storage = `${ramMatch[2]}GB`;
    }
    
    // Extract cores
    const coreMatch = productName.match(/(\d+)\s+CORE/i);
    if (coreMatch) {
      specs.cores = `${coreMatch[1]} Core`;
    }
    
    return specs;
  };

  const handleAddToCart = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product || product.stock === 0) return;
    
    const button = e.target;
    const originalText = button.textContent;
    
    try {
      button.textContent = 'Adding...';
      button.disabled = true;
      
      await addToCart({
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        images: product.images
      });
      
      button.textContent = 'Added!';
      button.className = button.className.replace('bg-blue-600', 'bg-green-600');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.className = button.className.replace('bg-green-600', 'bg-blue-600');
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to add to cart:', error);
      button.textContent = 'Error!';
      button.className = button.className.replace('bg-blue-600', 'bg-red-600');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.className = button.className.replace('bg-red-600', 'bg-blue-600');
        button.disabled = false;
      }, 2000);
    }
  };


  const capitalizeWord = (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <PageTitle />
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading {capitalizeWord(brand)} {capitalizeWord(model)} products...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !modelData) {
    return (
      <div className="min-h-screen bg-white">
        <PageTitle />
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-light text-gray-900 mb-4">Model negăsit</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link to={`/brands/${brand}`} className="bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors">
            Înapoi la modelele {capitalizeWord(brand)}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const productsToShow = getProductsToShow();

  return (
    <div className="min-h-screen bg-white">
      <PageTitle title={`${capitalizeWord(brand)} ${capitalizeWord(model)} Sisteme de Navigație`} />
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-blue-600">Acasă</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link to={`/brands/${brand}`} className="text-gray-600 hover:text-blue-600">
              {capitalizeWord(brand)}
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{capitalizeWord(model)}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm mr-4">
              <img 
                src={`/logos/${brand.toLowerCase()}.png`} 
                alt={`${capitalizeWord(brand)} logo`}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm font-semibold hidden">
                {brand.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-light text-gray-900">
                <span className="text-blue-600">{capitalizeWord(brand)} {capitalizeWord(model)}</span> Sisteme de Navigație
              </h1>
              <p className="text-gray-600 mt-1">
                {modelData.totalProducts} sisteme de navigație compatibile disponibile
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-end space-y-4 md:space-y-0">
            {/* Sort and View */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <SortAsc className="w-4 h-4 mr-1" />
                  Sortează:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                >
                  <option value="name">Nume</option>
                  <option value="price">Preț</option>
                </select>
              </div>
              
              <div className="flex border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {productsToShow.length > 0 ? (
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {productsToShow.map(product => (
                <ProductCard key={product._id} product={product} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nu au fost găsite produse</h3>
              <p className="text-gray-600">
                Nu au fost găsite sisteme de navigație pentru {capitalizeWord(brand)} {capitalizeWord(model)}
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ModelPage;