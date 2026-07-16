import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import apiService from './services/api';
import Footer from './components/Footer';
import Seo from './components/Seo';
import RecentlyViewed from './components/RecentlyViewed';
import FeaturedProductsCarousel from './components/FeaturedProductsCarousel';
import ReviewsCarousel from './components/ReviewsCarousel';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import {
  Check, Truck,
  Shield, ArrowRight
} from 'lucide-react';

const NavigationModel3D = lazy(() => import('./components/NavigationModel3D'));

const HomePage = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchError, setSearchError] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('idle'); // 'idle' | 'success'

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
      const products = await apiService.getFeaturedProducts();
      setFeaturedProducts(products);
    } catch (error) {
      console.error('Failed to load featured products:', error);
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
    
    // If no selections made, show inline error
    if (searchTerms.length === 0) {
      setSearchError('Te rog să selectezi cel puțin marca mașinii.');
      return;
    }
    setSearchError('');
    
    // Create search query and navigate to search results
    const searchQuery = searchTerms.join(' ');
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const carBrands = [
    { id: 'audi', name: 'Audi' },
    { id: 'bmw', name: 'BMW' },
    { id: 'mercedes benz', name: 'Mercedes Benz' },
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
    { id: 'isuzu', name: 'Isuzu' },
    { id: 'iveco', name: 'Iveco' }
  ];

  const carModels = {
    audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'TT'],
    bmw: ['Seria 1', 'Seria 3', 'Seria 5', 'X1', 'X3', 'X5'],
    'mercedes benz': ['A Class', 'B Class', 'C Class', 'E Class', 'CLS', 'ML', 'Sprinter', 'Viano', 'Vito'],
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
    isuzu: ['D-Max'],
    iveco: ['Daily']
  };

  const years = Array.from({ length: 20 }, (_, i) => 2024 - i);

  const scrollToVehicleSearch = () => {
    const section = document.getElementById('vehicle-search');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  const brands = [
    { name: 'Volkswagen', logo: '/logos/volkswagen.png' },
    { name: 'BMW', logo: '/logos/bmw.png' },
    { name: 'Mercedes Benz', logo: '/logos/mercedes benz.png' },
    { name: 'Audi', logo: '/logos/audi.png' },
    { name: 'Porsche', logo: '/logos/porsche.png' },
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
    { name: 'Iveco', logo: '/logos/iveco.png' },
    { name: 'Nissan', logo: '/logos/nissan.png' },
    { name: 'Kia', logo: '/logos/kia.png' },
    { name: 'Skoda', logo: '/logos/skoda.png' },
    { name: 'Seat', logo: '/logos/seat.png' },
    { name: 'Fiat', logo: '/logos/fiat.png' },
    { name: 'Jeep', logo: '/logos/jeep.png' },
    { name: 'Chevrolet', logo: '/logos/chevrolet.png' },
    { name: 'Smart', logo: '/logos/smart.png' },
    { name: 'Land Rover', logo: '/logos/land-rover.png' },
    { name: 'Mini', logo: '/logos/mini.png' }
  ];


  return (
    <div className="min-h-screen bg-white">
      <Seo path="/" />
      <Header />

      {/* Hero Section - Desktop: full-bleed looping video (fades in/out for a smooth loop) */}
      <section className="hidden lg:block relative bg-black overflow-hidden h-[620px] xl:h-[700px]">
        <video
          className="absolute inset-0 w-full h-full object-cover object-top"
          src="/hero-video.mp4"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
        {/* Left-to-right gradient keeps the overlaid text legible over the video */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none"></div>
        <div className="relative h-full container mx-auto px-4 flex items-center">
          <div className="max-w-xl text-left">
            <h1 className="text-5xl xl:text-6xl font-bold mb-6 text-white leading-tight">
              Navigații auto <span className="text-blue-400">dedicate</span>
            </h1>
            <p className="text-xl text-gray-200 mb-12">
              Plug &amp; play pentru toate mărcile. Garanție 1 an pe fiecare produs.
            </p>
            <div className="flex flex-row gap-4 justify-start">
              <Link
                to="/category/navigatii-gps"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                Vezi navigații GPS
              </Link>
              <button
                type="button"
                onClick={scrollToVehicleSearch}
                className="bg-white/95 text-blue-600 border-2 border-white px-8 py-3 rounded-lg hover:bg-white transition-colors font-medium"
              >
                Caută pentru mașina ta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section - Mobile/Tablet: original 3D model layout */}
      <section className="lg:hidden py-12 sm:py-20 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* 3D model first on mobile so the hero leads with the product */}
            <div className="relative order-first lg:order-last">
              <Suspense fallback={<div className="w-full h-64 sm:h-96 md:h-[500px]" />}>
                <NavigationModel3D />
              </Suspense>
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
            </div>
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 text-gray-900 leading-tight">
                Navigații auto <span className="text-blue-600">dedicate</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-12">
                Plug &amp; play pentru toate mărcile. Garanție 1 an pe fiecare produs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link
                  to="/category/navigatii-gps"
                  className="bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
                >
                  Vezi navigații GPS
                </Link>
                <button
                  type="button"
                  onClick={scrollToVehicleSearch}
                  className="bg-white text-blue-600 border-2 border-blue-600 px-6 sm:px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  Caută pentru mașina ta
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Carousel */}
      <FeaturedProductsCarousel />

      {/* Search Section */}
      <section id="vehicle-search" className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-light text-center mb-6 sm:mb-8">Găsește navigația pentru mașina ta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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
            {searchError && (
              <p className="mt-3 text-sm text-red-600 text-center">{searchError}</p>
            )}
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section id="brands-section" className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-light text-center mb-8 sm:mb-12">
            Compatibil cu <span className="text-blue-600">toate mărcile</span>
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 sm:gap-8">
            {brands.map((brand, index) => (
              <Link
                key={index}
                to={`/brand/${encodeURIComponent(brand.name.toLowerCase())}`}
                className="text-center group cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:bg-blue-50 group-hover:border-blue-200 transition-all duration-200 shadow-sm group-hover:shadow-md">
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
            
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-light">Produse <span className="text-blue-600">populare</span></h2>
            <Link to="/category/navigatii-gps" className="flex items-center text-sm hover:text-blue-600 text-gray-600 shrink-0">
              Vezi toate
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product._id} product={product} className="h-full" />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-4xl mx-auto">
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
              <h3 className="font-medium mb-2">Garanție 1 an</h3>
              <p className="text-sm text-gray-600">Pe toate produsele</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-2">Asistență tehnică profesională</h3>
              <p className="text-sm text-gray-600">Specialiști disponibili permanent</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <ReviewsCarousel />

      {/* Newsletter */}
      <section className="py-12 sm:py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          {newsletterStatus === 'success' ? (
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">Mulțumim!</h2>
              <p className="text-blue-100">Te-ai abonat cu succes. Vei primi reducerea în curând.</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Reduceri exclusive în inbox</h2>
              <p className="text-blue-100 mb-6 sm:mb-8">Abonează-te și primești 10% reducere la prima comandă.</p>
              <form
                className="max-w-md mx-auto flex flex-col sm:flex-row gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail.trim()) setNewsletterStatus('success');
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Adresa ta de email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  type="submit"
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium whitespace-nowrap"
                >
                  Abonează-te
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Recently Viewed */}
      <RecentlyViewed />

      <Footer />
    </div>
  );
};

export default HomePage;
