import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, Home, Package } from 'lucide-react';
import PageTitle from './components/PageTitle';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);

  const paymentId = searchParams.get('paymentId');
  const orderNumber = searchParams.get('orderNumber');

  useEffect(() => {
    if (paymentId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`/api/webhooks/payment/${paymentId}/status`);
      const data = await response.json();
      
      if (response.ok) {
        setPaymentData(data);
      } else {
        setError(data.message || 'Eroare la verificarea plății');
      }
    } catch (err) {
      setError('Eroare la verificarea plății');
      console.error('Payment status check failed:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se verifică statusul plății...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Eroare la verificarea plății
            </h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Înapoi la magazin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = paymentData?.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageTitle title={isSuccess ? 'Plată finalizată' : 'Plată procesată'} />
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isSuccess ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            <CheckCircle className={`w-8 h-8 ${
              isSuccess ? 'text-green-600' : 'text-yellow-600'
            }`} />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isSuccess ? 'Plată finalizată cu succes!' : 'Plată în procesare'}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {isSuccess 
              ? 'Mulțumim pentru plată! Comanda ta a fost confirmată.'
              : 'Plata ta este în procesare. Vei fi notificat când va fi finalizată.'
            }
          </p>

          {orderNumber && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="font-semibold text-gray-900 mb-2">Detalii comandă</h2>
              <p className="text-sm text-gray-600">
                Număr comandă: <span className="font-mono font-semibold">{orderNumber}</span>
              </p>
              {paymentData && (
                <p className="text-sm text-gray-600 mt-1">
                  Status plată: <span className={`font-semibold ${
                    isSuccess ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {paymentData.status === 'completed' ? 'Finalizată' : 
                     paymentData.status === 'pending' ? 'În așteptare' : 
                     paymentData.status}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {isSuccess && (
              <button className="flex items-center justify-center w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Descarcă factura
              </button>
            )}
            
            <Link
              to="/track-order"
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Urmărește comanda
            </Link>
            
            <Link
              to="/"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Continuă cumpărăturile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;