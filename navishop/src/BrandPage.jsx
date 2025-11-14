import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import apiService from './services/api';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import Footer from './components/Footer';
import CarModelCard from './components/CarModelCard';
import { Car, ChevronRight, Search } from 'lucide-react';

const BRAND_ALIASES = {
  vw: 'volkswagen'
};

const FALLBACK_BRAND_MODELS = {
  audi: {
    brand: 'Audi',
    models: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'TT']
  },
  bmw: {
    brand: 'BMW',
    models: ['Seria 1', 'Seria 3', 'Seria 5', 'X1', 'X3', 'X5']
  },
  mercedes: {
    brand: 'Mercedes',
    models: ['A Class', 'B Class', 'C Class', 'E Class', 'CLS', 'ML', 'Sprinter', 'Viano', 'Vito']
  },
  volkswagen: {
    brand: 'Volkswagen',
    models: ['Golf', 'Passat', 'Polo', 'Tiguan', 'Touran', 'Jetta', 'Amarok', 'Arteon', 'Sharan', 'Touareg', 'T-Cross', 'T-Roc', 'Scirocco', 'Taigo', 'Transporter', 'Caravelle', 'Multivan', 'Crafter']
  },
  toyota: {
    brand: 'Toyota',
    models: ['Auris', 'Avensis', 'Aygo', 'Corolla', 'CHR', 'Hilux', 'Land Cruiser', 'Prius', 'Proace', 'Rav4', 'Yaris']
  },
  ford: {
    brand: 'Ford',
    models: ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'Ranger', 'Transit', 'EcoSport', 'Galaxy', 'S-Max']
  },
  opel: {
    brand: 'Opel',
    models: ['Astra', 'Corsa', 'Insignia', 'Mokka', 'Zafira', 'Vectra', 'Meriva', 'Antara', 'Vivaro']
  },
  dacia: {
    brand: 'Dacia',
    models: ['Logan', 'Sandero', 'Duster', 'Lodgy', 'Dokker', 'Jogger']
  },
  renault: {
    brand: 'Renault',
    models: ['Clio', 'Megane', 'Captur', 'Kadjar', 'Koleos', 'Trafic', 'Master']
  },
  peugeot: {
    brand: 'Peugeot',
    models: ['206', '207', '208', '307', '308', '407', '508', '2008', '3008', '5008']
  },
  citroen: {
    brand: 'Citroen',
    models: ['C1', 'C4', 'C5', 'Berlingo', 'Jumper', 'Jumpy']
  },
  honda: {
    brand: 'Honda',
    models: ['Civic', 'Accord', 'CRV']
  },
  nissan: {
    brand: 'Nissan',
    models: ['Qashqai', 'X-Trail', 'Juke', 'Navara', 'Pathfinder']
  },
  hyundai: {
    brand: 'Hyundai',
    models: ['i10', 'i20', 'i30', 'Elantra', 'Tucson', 'Santa Fe', 'Kona']
  },
  kia: {
    brand: 'Kia',
    models: ['Ceed', 'Sportage', 'Sorento']
  },
  mazda: {
    brand: 'Mazda',
    models: ['3', '5', '6', 'CX5', 'CX7', 'BT-50', 'MX-5']
  },
  skoda: {
    brand: 'Skoda',
    models: ['Fabia', 'Octavia', 'Superb', 'Yeti', 'Kodiaq']
  },
  seat: {
    brand: 'Seat',
    models: ['Ibiza', 'Leon', 'Altea', 'Toledo', 'Arona', 'Ateca']
  },
  fiat: {
    brand: 'Fiat',
    models: ['500', 'Bravo', 'Doblo', 'Ducato', 'Tipo']
  },
  jeep: {
    brand: 'Jeep',
    models: ['Compass', 'Grand Cherokee', 'Patriot', 'Renegade']
  },
  suzuki: {
    brand: 'Suzuki',
    models: ['Grand Vitara', 'Jimny', 'Swift', 'SX4', 'Vitara']
  },
  mitsubishi: {
    brand: 'Mitsubishi',
    models: ['Pajero']
  },
  'alfa romeo': {
    brand: 'Alfa Romeo',
    models: ['Mito']
  },
  subaru: {
    brand: 'Subaru',
    models: ['Legacy']
  },
  volvo: {
    brand: 'Volvo',
    models: ['C30', 'C70', 'S40', 'S60', 'V50', 'XC60']
  },
  isuzu: {
    brand: 'Isuzu',
    models: ['D-Max']
  },
  chevrolet: {
    brand: 'Chevrolet',
    models: []
  }
};

const buildFallbackData = (brandKey) => {
  const normalized = (BRAND_ALIASES[brandKey] || brandKey || '').toLowerCase();
  const fallback = FALLBACK_BRAND_MODELS[normalized];
  if (!fallback) return null;

  return {
    brand: fallback.brand,
    models: fallback.models.map((modelName) => ({
      model: modelName,
      modelKey: modelName.toLowerCase().replace(/\s+/g, '-'),
      years: null,
      productCount: 0
    }))
  };
};

const BrandPage = () => {
  const { brand } = useParams();
  const { isAuthenticated } = useAuth();
  const { getCartItemsCount } = useCart();
  const [brandData, setBrandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    loadBrandData();
  }, [brand]);

  const loadBrandData = async () => {
    try {
      setLoading(true);
      const normalizedParam = decodeURIComponent(brand || '').replace(/\+/g, ' ').trim();
      const normalizedBrand = (BRAND_ALIASES[normalizedParam.toLowerCase()] || normalizedParam).toLowerCase();
      const data = await apiService.getBrandModels(normalizedBrand);
      
      if (data?.success) {
        setBrandData(data.data);
        setError(null);
        return;
      }

      const fallback = buildFallbackData(normalizedBrand);
      if (fallback) {
        setBrandData(fallback);
        setError(null);
      } else {
        setError('Brand not found');
      }
    } catch (error) {
      console.error('Failed to load brand data:', error);
      const fallback = buildFallbackData((brand || '').toLowerCase());
      if (fallback) {
        setBrandData(fallback);
        setError(null);
      } else {
        setError('Failed to load brand data');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = brandData?.models?.filter(model =>
    model.model.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getModelImage = (modelName) => {
    // Return a placeholder or brand-specific image
    return `/logos/${brand.toLowerCase()}.png`;
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
            <span className="ml-3 text-gray-600">Loading {capitalizeWord(brand)} models...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <PageTitle />
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-light text-gray-900 mb-4">Brand Not Found</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link to="/" className="bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PageTitle title={`${brandData.brand} Navigation Systems`} />
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-blue-600">Home</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{brandData.brand}</span>
          </nav>
        </div>
      </div>

      {/* Header Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
              <img 
                src={`/logos/${brand.toLowerCase()}.png`} 
                alt={`${brandData.brand} logo`}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm font-semibold hidden">
                {brandData.brand.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-light mb-4 text-gray-900">
            Navigații <span className="text-blue-600">{brandData.brand}</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Alege modelul {brandData.brand} pentru a găsi produsele compatibile
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Caută modele..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </section>

      {/* Models Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredModels.map((modelData) => (
              <CarModelCard
                key={modelData.modelKey}
                brand={brandData.brand}
                modelData={modelData}
                modelKey={modelData.modelKey}
              />
            ))}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No models found</h3>
              <p className="text-gray-600">
                {searchQuery ? 
                  `No ${brandData.brand} models match your search "${searchQuery}"` :
                  `No ${brandData.brand} models available`
                }
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BrandPage;
