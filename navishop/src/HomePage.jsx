import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import apiService from './services/api';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import RecentlyViewed from './components/RecentlyViewed';
import NavigationModel3D from './components/NavigationModel3D';
import FeaturedProductsCarousel from './components/FeaturedProductsCarousel';
import ReviewsCarousel from './components/ReviewsCarousel';
import Header from './components/Header';
import {
  Star, Heart, Check, Truck,
  Shield, Phone, Mail, ArrowRight
} from 'lucide-react';

const HomePage = () => {
  const { isAuthenticated, login } = useAuth();
  const { getCartItemsCount } = useCart();
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    loadFeaturedProducts();
    
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    
    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        login(user, token, true); // Remember OAuth users
        // Clean up URL without redirecting
        window.history.replaceState({}, document.title, '/');
      } catch (err) {
        console.error('Error parsing OAuth user data:', err);
      }
    }
  }, [login]);

  const loadFeaturedProducts = async () => {
    try {
      const response = await apiService.getFeaturedProducts();
      // Handle both response formats: {products: [...]} or [...]
      const products = response.products || response || [];
      setFeaturedProducts(Array.isArray(products) ? products : []);
    } catch (error) {
      console.error('Failed to load featured products:', error);
      setFeaturedProducts([]); // Ensure it's always an array
    }
  };

  const handleCarSearch = () => {
    // Build search query based on selected car details
    let searchTerms = [];
    
    if (selectedBrand) {
      // Convert brand ID to brand name for search
      const brandData = carBrands.find(b => b.id === selectedBrand);
      if (brandData) {
        searchTerms.push(brandData.name);
      }
    }
    
    if (selectedModel) {
      searchTerms.push(selectedModel);
    }
    
    if (selectedYear) {
      searchTerms.push(selectedYear);
    }
    
    // If no selections made, show error or redirect to general search
    if (searchTerms.length === 0) {
      alert('Te rog să selectezi cel puțin marca mașinii pentru a găsi navigații compatibile.');
      return;
    }
    
    // Create search query and navigate to search results
    const searchQuery = searchTerms.join(' ');
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const carBrands = [
    { id: 'audi', name: 'Audi' },
    { id: 'bmw', name: 'BMW' },
    { id: 'mercedes', name: 'Mercedes' },
    { id: 'volkswagen', name: 'Volkswagen' },
    { id: 'vw', name: 'VW' },
    { id: 'toyota', name: 'Toyota' },
    { id: 'ford', name: 'Ford' },
    { id: 'opel', name: 'Opel' },
    { id: 'dacia', name: 'Dacia' },
    { id: 'renault', name: 'Renault' },
    { id: 'peugeot', name: 'Peugeot' },
    { id: 'citroen', name: 'Citroen' },
    { id: 'honda', name: 'Honda' },
    { id: 'nissan', name: 'Nissan' },
    { id: 'hyundai', name: 'Hyundai' },
    { id: 'kia', name: 'Kia' },
    { id: 'mazda', name: 'Mazda' },
    { id: 'mitsubishi', name: 'Mitsubishi' },
    { id: 'subaru', name: 'Subaru' },
    { id: 'volvo', name: 'Volvo' },
    { id: 'skoda', name: 'Skoda' },
    { id: 'seat', name: 'Seat' },
    { id: 'fiat', name: 'Fiat' },
    { id: 'jeep', name: 'Jeep' },
    { id: 'chevrolet', name: 'Chevrolet' },
    { id: 'suzuki', name: 'Suzuki' },
    { id: 'alfa-romeo', name: 'Alfa Romeo' },
    { id: 'isuzu', name: 'Isuzu' }
  ];

  const carModels = {
    audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'TT'],
    bmw: ['Seria 1', 'Seria 3', 'Seria 5', 'X1', 'X3', 'X5'],
    mercedes: ['A Class', 'B Class', 'C Class', 'E Class', 'CLS', 'ML', 'Sprinter', 'Viano', 'Vito'],
    volkswagen: ['Golf', 'Passat', 'Polo', 'Tiguan', 'Touran', 'Jetta', 'Amarok', 'Arteon', 'Sharan', 'Touareg', 'T-Cross', 'T-Roc', 'Scirocco', 'Taigo', 'Transporter', 'Caravelle', 'Multivan', 'Crafter'],
    vw: ['Golf', 'Passat', 'Polo', 'Tiguan', 'Touran', 'Jetta', 'Amarok', 'Arteon', 'Sharan', 'Touareg', 'T-Cross', 'T-Roc', 'Scirocco', 'Taigo', 'Transporter', 'Caravelle', 'Multivan', 'Crafter'],
    toyota: ['Auris', 'Avensis', 'Aygo', 'Corolla', 'CHR', 'Hilux', 'Land Cruiser', 'Prius', 'Proace', 'Rav4', 'Yaris'],
    ford: ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'Ranger', 'Transit', 'EcoSport', 'Galaxy', 'S-Max'],
    opel: ['Astra', 'Corsa', 'Insignia', 'Mokka', 'Zafira', 'Vectra', 'Meriva', 'Antara', 'Vivaro'],
    dacia: ['Logan', 'Sandero', 'Duster', 'Lodgy', 'Dokker', 'Jogger'],
    renault: ['Clio', 'Megane', 'Captur', 'Kadjar', 'Koleos', 'Trafic', 'Master'],
    peugeot: ['206', '207', '208', '307', '308', '407', '508', '2008', '3008', '5008'],
    citroen: ['C1', 'C4', 'C5', 'Berlingo', 'Jumper', 'Jumpy'],
    honda: ['Civic', 'Accord', 'CRV'],
    nissan: ['Qashqai', 'X-Trail', 'Juke', 'Navara', 'Pathfinder'],
    hyundai: ['i10', 'i20', 'i30', 'Elantra', 'Tucson', 'Santa Fe', 'Kona', 'I30'],
    kia: ['Ceed', 'Sportage', 'Sorento'],
    mazda: ['3', '5', '6', 'CX5', 'CX7', 'BT-50', 'MX-5'],
    skoda: ['Fabia', 'Octavia', 'Superb', 'Yeti', 'Kodiaq'],
    seat: ['Ibiza', 'Leon', 'Altea', 'Toledo', 'Arona', 'Ateca'],
    fiat: ['500', 'Bravo', 'Doblo', 'Ducato', 'Tipo'],
    jeep: ['Compass', 'Grand Cherokee', 'Patriot', 'Renegade'],
    chevrolet: [],
    suzuki: ['Grand Vitara', 'Jimny', 'Swift', 'SX4', 'Vitara'],
    mitsubishi: ['Pajero'],
    'alfa-romeo': ['Mito'],
    subaru: ['Legacy'],
    volvo: ['C30', 'C70', 'S40', 'S60', 'V50', 'XC60'],
    isuzu: ['D-Max']
  };

  const years = Array.from({ length: 20 }, (_, i) => 2024 - i);


  const brands = [
    { name: 'Volkswagen', logo: '/logos/volkswagen.png' },
    { name: 'BMW', logo: '/logos/bmw.png' },
    { name: 'Mercedes', logo: '/logos/mercedes.png' },
    { name: 'Audi', logo: '/logos/audi.png' },
    { name: 'Ford', logo: '/logos/ford.png' },
    { name: 'Opel', logo: '/logos/opel.png' },
    { name: 'Dacia', logo: '/logos/dacia.png' },
    { name: 'Renault', logo: '/logos/renault.png' },
    { name: 'Peugeot', logo: '/logos/peugeot.png' },
    { name: 'Citroen', logo: '/logos/citroen.png' },
    { name: 'Toyota', logo: '/logos/toyota.png' },
    { name: 'Honda', logo: '/logos/honda.png' },
    { name: 'Hyundai', logo: '/logos/hyundai.png' },
    { name: 'Mazda', logo: '/logos/mazda.png' },
    { name: 'Suzuki', logo: '/logos/suzuki.png' },
    { name: 'Mitsubishi', logo: '/logos/mitsubishi.png' },
    { name: 'Alfa Romeo', logo: '/logos/alfa-romeo.png' },
    { name: 'Subaru', logo: '/logos/subaru.png' },
    { name: 'Volvo', logo: '/logos/volvo.png' },
    { name: 'Isuzu', logo: '/logos/isuzu.png' },
    { name: 'Nissan', logo: '/logos/nissan.png' },
    { name: 'Kia', logo: '/logos/kia.png' },
    { name: 'Skoda', logo: '/logos/skoda.png' },
    { name: 'Seat', logo: '/logos/seat.png' },
    { name: 'Fiat', logo: '/logos/fiat.png' },
    { name: 'Jeep', logo: '/logos/jeep.png' },
    { name: 'Chevrolet', logo: '/logos/chevrolet.png' }
  ];


  const ProductCard = ({ product }) => {
    const { addToCart } = useCart();

    const getBadgeText = () => {
      if (product.featured) return 'Bestseller';
      if (product.newProduct) return 'Nou';
      if (product.onSale && product.discount > 0) return `-${product.discount}%`;
      return null;
    };

    const getCompatibilityText = () => {
      if (product.compatibility && product.compatibility.length > 0) {
        const brands = product.compatibility.map(comp => comp.brand).join(', ');
        return brands;
      }
      return product.category.replace('-', ' ').toUpperCase();
    };

    const handleAddToCart = async (e) => {
      e.preventDefault(); // Prevent navigation if button is inside a link
      e.stopPropagation();
      
      if (!product || product.stock === 0) return;
      
      // Get the button element for visual feedback
      const button = e.target;
      const originalText = button.textContent;
      
      try {
        // Show loading state
        button.textContent = 'Se adaugă...';
        button.disabled = true;
        
        await addToCart({
          _id: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          images: product.images
        });
        
        // Show success state
        button.textContent = 'Adăugat!';
        button.className = button.className.replace('bg-blue-600', 'bg-green-600');
        
        // Reset after 2 seconds
        setTimeout(() => {
          button.textContent = originalText;
          button.className = button.className.replace('bg-green-600', 'bg-blue-600');
          button.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error('Failed to add to cart:', error);
        
        // Show error state
        button.textContent = 'Eroare!';
        button.className = button.className.replace('bg-blue-600', 'bg-red-600');
        
        // Reset after 2 seconds
        setTimeout(() => {
          button.textContent = originalText;
          button.className = button.className.replace('bg-red-600', 'bg-blue-600');
          button.disabled = false;
        }, 2000);
      }
    };

    const badge = getBadgeText();

    return (
      <div className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-200 group h-full flex flex-col">
        <div className="relative">
          <Link to={`/product/${product.slug}`} className="block">
            <div className="w-full h-48 bg-gray-50 flex items-center justify-center">
              {product.images && product.images.length > 0 ? (
                <img 
                  src={product.images[0].url} 
                  alt={product.images[0].alt || product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded border border-blue-200"></div>
              )}
            </div>
          </Link>
          {badge && (
            <div className="absolute top-3 left-3">
              <span className={`px-2 py-1 text-xs font-medium ${
                badge === 'Bestseller' ? 'bg-blue-600 text-white' :
                badge === 'Nou' ? 'bg-black text-white' :
                'bg-blue-600 text-white'
              }`}>
                {badge}
              </span>
            </div>
          )}
          <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Heart className="w-5 h-5 text-gray-400 hover:text-blue-600" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col flex-grow">
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-medium text-gray-900 mb-1 hover:text-blue-600 transition-colors h-12 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.name}</h3>
            <p className="text-sm text-gray-600 mb-3 truncate">{getCompatibilityText()}</p>
          </Link>
          
          <div className="flex items-center mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.averageRating || 0) ? 'fill-blue-600 text-blue-600' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-xs text-gray-600 ml-2">({product.totalReviews || 0})</span>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">{product.price} lei</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm text-gray-500 line-through">{product.originalPrice} lei</span>
              )}
            </div>
            <span className={`text-xs ${product.stock > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {product.stock > 0 ? 'În stoc' : 'Stoc epuizat'}
            </span>
          </div>
          
          <div className="mt-auto">
            <button 
              onClick={handleAddToCart}
              className={`w-full py-2 text-sm font-medium transition-colors ${
                product.stock > 0 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
              disabled={product.stock === 0}
            >
              {product.stock > 0 ? 'Adaugă în coș' : 'Indisponibil'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <PageTitle />
      <Header />

      {/* Hero Section */}
      <section className="py-20 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-light mb-6 text-gray-900">
                Navigații auto <span className="text-blue-600">moderne</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 font-light">
                Sisteme dedicate pentru toate mărcile de mașini
              </p>
              <button className="bg-blue-600 text-white px-8 py-3 hover:bg-blue-700 transition-colors font-medium">
                Explorează produsele
              </button>
            </div>
            <div className="relative">
              <NavigationModel3D />
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <FeaturedProductsCarousel />

      {/* Search Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-light text-center mb-8">Găsește navigația pentru mașina ta</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select 
                className="w-full p-3 border border-gray-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <option value="">Marca</option>
                {carBrands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              
              <select 
                className="w-full p-3 border border-gray-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedBrand}
              >
                <option value="">Model</option>
                {selectedBrand && carModels[selectedBrand]?.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              
              <select 
                className="w-full p-3 border border-gray-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">An</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <button 
                onClick={handleCarSearch}
                className="w-full bg-blue-600 text-white py-3 hover:bg-blue-700 transition-colors font-medium"
              >
                Caută
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-light text-center mb-12">
            Compatibil cu <span className="text-blue-600">toate mărcile</span>
          </h2>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-8">
            {brands.map((brand, index) => (
              <Link 
                key={index} 
                to={`/brand/${encodeURIComponent(brand.name.toLowerCase())}`}
                className="text-center group cursor-pointer"
              >
                <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-50 group-hover:border-blue-200 transition-all duration-200 shadow-sm group-hover:shadow-md">
                  <img 
                    src={brand.logo} 
                    alt={`${brand.name} logo`}
                    className={`object-contain filter grayscale group-hover:grayscale-0 transition-all duration-200 ${
                      brand.name === 'Ford' || brand.name === 'Opel' || brand.name === 'Renault' || brand.name === 'Fiat' ? 'w-18 h-18' : 'w-14 h-14'
                    }`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm font-semibold hidden">
                    {brand.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">{brand.name}</p>
              </Link>
            ))}
            
            {/* Coming Soon Placeholder */}
            <div className="text-center group cursor-default">
              <div className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-gray-100 transition-all duration-200">
                <div className="text-center">
                  <div className="text-gray-400 text-lg mb-1">+</div>
                </div>
              </div>
              <p className="text-sm text-gray-500">Mai multe<br />curând</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-light">Produse <span className="text-blue-600">populare</span></h2>
            <button className="flex items-center text-sm hover:text-blue-600 text-gray-600">
              Vezi toate
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.map(product => (
                <ProductCard key={product._id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                Loading featured products...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-2">Livrare gratuită</h3>
              <p className="text-sm text-gray-600">Pentru comenzi peste 500 lei</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-2">Garanție 3 ani</h3>
              <p className="text-sm text-gray-600">Pe toate produsele</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-2">Instalare inclusă</h3>
              <p className="text-sm text-gray-600">Service profesional</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <ReviewsCarousel />

      {/* Newsletter */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-light mb-4">Rămâi la curent</h2>
          <p className="text-blue-100 mb-8">Primește noutăți și oferte exclusive</p>
          <div className="max-w-md mx-auto flex space-x-4">
            <input
              type="email"
              placeholder="Email"
              className="flex-1 px-4 py-3 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button className="bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors font-medium">
              Abonează-te
            </button>
          </div>
        </div>
      </section>

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

export default HomePage;