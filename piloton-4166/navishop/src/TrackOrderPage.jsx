import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from './services/api';
import PageTitle from './components/PageTitle';
import {
  Search, Package, Truck, CheckCircle, Clock, AlertCircle, Phone, Mail, MapPin, 
  ExternalLink, RotateCcw
} from 'lucide-react';

const TrackOrderPage = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shippingDetails, setShippingDetails] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderNumber.trim() || !email.trim()) {
      setError('Toate câmpurile sunt obligatorii');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const result = await apiService.trackGuestOrder(orderNumber.trim(), email.trim());
      setOrder(result);
      
      // If order has shipping info, try to get detailed tracking
      if (result.shipping?.awbNumber) {
        await fetchShippingDetails(result.shipping.awbNumber);
      }
    } catch (error) {
      console.error('Order tracking failed:', error);
      setError(error.message || 'Nu am găsit comanda. Verifică numărul comenzii și email-ul.');
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingDetails = async (awbNumber) => {
    setTrackingLoading(true);
    try {
      const result = await apiService.trackShipment(awbNumber);
      if (result.success) {
        setShippingDetails(result);
      }
    } catch (error) {
      console.error('Shipping tracking failed:', error);
      // Don't show error for shipping tracking failure
    } finally {
      setTrackingLoading(false);
    }
  };

  const refreshShippingTracking = async () => {
    if (order?.shipping?.awbNumber) {
      await fetchShippingDetails(order.shipping.awbNumber);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'confirmed': return 'text-blue-600 bg-blue-50';
      case 'processing': return 'text-purple-600 bg-purple-50';
      case 'shipped': return 'text-green-600 bg-green-50';
      case 'delivered': return 'text-green-800 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'În așteptare';
      case 'confirmed': return 'Confirmată';
      case 'processing': return 'În procesare';
      case 'shipped': return 'Expediată';
      case 'delivered': return 'Livrată';
      case 'cancelled': return 'Anulată';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5" />;
      case 'processing': return <Package className="w-5 h-5" />;
      case 'shipped': return <Truck className="w-5 h-5" />;
      case 'delivered': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <AlertCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageTitle title="Urmărește comanda" />
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Urmărește comanda
          </h1>
          <p className="text-gray-600">
            Introdu numărul comenzii și email-ul pentru a vedea statusul
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Număr comandă
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: GO123456789"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email comandă
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ion.popescu@email.com"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Caută...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Caută comanda
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Comanda #{order.orderNumber}
                </h2>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span className="ml-2">{getStatusText(order.status)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Detalii comandă</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Data plasării: {formatDate(order.createdAt)}</p>
                    <p>Total: {order.grandTotal} lei</p>
                    <p>Plată: {order.paymentMethod === 'cash_on_delivery' ? 'La livrare' : 'Transfer bancar'}</p>
                    {order.trackingCode && (
                      <p>Cod urmărire: <span className="font-mono font-medium">{order.trackingCode}</span></p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Adresă livrare
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>{order.shippingAddress.street}</p>
                    <p>{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                    <p>{order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Tracking */}
            {order.shipping?.awbNumber && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-blue-600" />
                    Urmărire livrare FAN Courier
                  </h3>
                  <button
                    onClick={refreshShippingTracking}
                    disabled={trackingLoading}
                    className="flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 mr-1 ${trackingLoading ? 'animate-spin' : ''}`} />
                    Actualizează
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Detalii expediere</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>AWB: <span className="font-mono font-medium text-blue-600">{order.shipping.awbNumber}</span></p>
                      <p>Furnizor: FAN Courier</p>
                      {order.shipping.cost && (
                        <p>Cost livrare: {order.shipping.cost.toFixed(2)} RON</p>
                      )}
                      {order.shipping.office && (
                        <p>Birou: {order.shipping.office}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Status curent</h4>
                    {trackingLoading ? (
                      <div className="flex items-center text-blue-600">
                        <Clock className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">Se încarcă informațiile...</span>
                      </div>
                    ) : shippingDetails ? (
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {shippingDetails.status || 'În procesare'}
                          </div>
                        </div>
                        {shippingDetails.statusDescription && (
                          <p className="text-sm text-gray-600">{shippingDetails.statusDescription}</p>
                        )}
                        {shippingDetails.deliveryDate && (
                          <p className="text-sm text-green-600">
                            Livrat la: {new Date(shippingDetails.deliveryDate).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Nu sunt disponibile informații de urmărire în acest moment.
                      </div>
                    )}
                  </div>
                </div>

                {shippingDetails?.history && shippingDetails.history.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Istoric expediere</h4>
                    <div className="space-y-3">
                      {shippingDetails.history.map((event, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{event.status}</p>
                            {event.description && (
                              <p className="text-sm text-gray-600">{event.description}</p>
                            )}
                            {event.location && (
                              <p className="text-xs text-gray-500">{event.location}</p>
                            )}
                            {event.date && (
                              <p className="text-xs text-gray-400">
                                {new Date(event.date).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center text-blue-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    <span className="text-sm">
                      Pentru informații detaliate, poți urmări coletul și pe 
                      <a 
                        href={`https://www.fancourier.ro/awb-tracking/?xawb=${order.shipping.awbNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline ml-1"
                      >
                        site-ul FAN Courier
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Produse comandate
              </h3>
              
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg">
                    <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Cantitate: {item.quantity}
                      </p>
                      <p className="text-sm text-gray-500">
                        Preț: {item.price} lei
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {item.price * item.quantity} lei
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 mt-6 pt-6">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total comandă:</span>
                  <span>{order.grandTotal} lei</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-medium text-blue-900 mb-4">
                Ai întrebări despre comandă?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-blue-700">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>0800 123 456</span>
                </div>
                <div className="flex items-center text-blue-700">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>comenzi@piloton.ro</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Order Found */}
        {!order && !loading && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Caută o comandă
            </h3>
            <p className="text-gray-600 mb-6">
              Introdu datele de mai sus pentru a urmări statusul comenzii tale
            </p>
            <Link
              to="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              Înapoi la magazin
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;