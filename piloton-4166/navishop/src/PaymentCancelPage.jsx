import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, Home } from 'lucide-react';
import PageTitle from './components/PageTitle';

const PaymentCancelPage = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageTitle title="Plată anulată" />
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Plată anulată
          </h1>
          
          <p className="text-gray-600 mb-8">
            Plata a fost anulată. Poți reveni oricând pentru a finaliza comanda.
          </p>

          {orderNumber && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="font-semibold text-gray-900 mb-2">Comanda ta</h2>
              <p className="text-sm text-gray-600">
                Număr comandă: <span className="font-mono font-semibold">{orderNumber}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Comanda rămâne în sistem și poți plăti mai târziu
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to="/checkout"
              className="flex items-center justify-center w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Încearcă din nou
            </Link>
            
            <Link
              to="/cart"
              className="block w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Înapoi la coș
            </Link>
            
            <Link
              to="/"
              className="flex items-center justify-center w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Înapoi la magazin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;