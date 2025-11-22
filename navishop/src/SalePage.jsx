import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from './services/api';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import { Percent, Sparkles } from 'lucide-react';

const SalePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getProducts({
          onSale: true,
          sortBy: 'discount',
          sortOrder: 'desc',
          limit: 48
        });
        setProducts(data?.products || []);
      } catch (err) {
        console.error('Failed to load sale products:', err);
        setError('Nu am putut încărca produsele aflate în promoție.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PageTitle title="Reduceri" />
      <Header />

      <section className="bg-gradient-to-b from-red-50 via-white to-white border-b border-red-100">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white border border-red-100 rounded-full flex items-center justify-center shadow-sm">
              <Percent className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <p className="inline-flex items-center bg-red-100 text-red-700 px-4 py-1 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Promoții active
          </p>
          <h1 className="text-4xl font-light text-gray-900 mb-4">
            Navigații auto <span className="text-red-500 font-semibold">cu reducere</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Profită de reducerile limitate pentru modelele compatibile cu mașina ta și prinde cele mai bune prețuri la navigații auto moderne.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-600">
              Încărcăm produsele aflate la reducere...
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-5 py-3 border border-red-200 text-red-600 hover:text-red-700 rounded-lg"
              >
                Reîncearcă
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-600 mb-4">Momentan nu avem produse reduse disponibile.</p>
              <Link to="/" className="text-blue-600 hover:text-blue-700 font-semibold">
                Înapoi la catalog
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {products.length} {products.length === 1 ? 'produs redus' : 'produse reduse' }
                </h2>
                <span className="text-sm text-gray-500">
                  Sortate după discount descrescător
                </span>
              </div>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} viewMode="grid" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SalePage;
