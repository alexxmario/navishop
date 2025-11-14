import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import apiService from './services/api';
import {
  LogOut, Settings, Package, Clock, MapPin, CreditCard, User
} from 'lucide-react';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { getCartItemsCount } = useCart();
  const [activeTab, setActiveTab] = useState('account');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab]);

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const userOrders = await apiService.getUserOrders();
      setOrders(userOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrdersError('Nu s-au putut încărca comenzile. Încercați din nou.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'În așteptare',
      'confirmed': 'Confirmată',
      'processing': 'În procesare',
      'shipped': 'Expediată',
      'delivered': 'Livrată',
      'cancelled': 'Anulată'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Dashboard" />
      <Header />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-white border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-light text-gray-900 mb-2">
                  Bună ziua, {user?.name}!
                </h1>
                <p className="text-gray-600">Bine ai venit în contul tău PilotOn</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Deconectare</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-100 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Contul meu</h2>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('account')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors ${
                      activeTab === 'account' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Detalii cont</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors ${
                      activeTab === 'orders' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Comenzile mele</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors ${
                      activeTab === 'settings' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Setări</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === 'account' && (
                <div className="bg-white border border-gray-100 p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-6">Detalii cont</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nume complet
                      </label>
                      <div className="border border-gray-200 px-3 py-2 bg-gray-50">
                        {user?.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="border border-gray-200 px-3 py-2 bg-gray-50">
                        {user?.email}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Membru din
                      </label>
                      <div className="border border-gray-200 px-3 py-2 bg-gray-50">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ro-RO') : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status cont
                      </label>
                      <div className="border border-gray-200 px-3 py-2 bg-gray-50">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="bg-white border border-gray-100 p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-6">Comenzile mele</h2>
                  
                  {ordersLoading && (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 hover:bg-blue-400 transition ease-in-out duration-150 cursor-not-allowed">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Se încarcă comenzile...
                      </div>
                    </div>
                  )}

                  {ordersError && (
                    <div className="text-center py-8">
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {ordersError}
                        <button 
                          onClick={loadOrders}
                          className="ml-2 text-red-800 underline hover:text-red-900"
                        >
                          Încearcă din nou
                        </button>
                      </div>
                    </div>
                  )}

                  {!ordersLoading && !ordersError && orders.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">Nu aveți comenzi încă</p>
                      <Link 
                        to="/" 
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Începeți să cumpărați
                      </Link>
                    </div>
                  )}

                  {!ordersLoading && !ordersError && orders.length > 0 && (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order._id} className="border border-gray-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-4">
                              <div>
                                <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(order.createdAt).toLocaleDateString('ro-RO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{order.grandTotal.toFixed(2)} LEI</p>
                              <p className="text-sm text-gray-500">{order.items.length} produs{order.items.length > 1 ? 'e' : ''}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex items-center space-x-3">
                                {item.image && (
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm text-gray-700">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                    Cantitate: {item.quantity} × {item.price.toFixed(2)} LEI
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center text-sm text-gray-500">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>
                              {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.county}
                            </span>
                          </div>
                          {order.trackingCode && (
                            <div className="mt-2 flex items-center text-sm text-blue-600">
                              <Package className="w-4 h-4 mr-1" />
                              <span>Cod urmărire: {order.trackingCode}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-white border border-gray-100 p-6">
                  <h2 className="text-xl font-medium text-gray-900 mb-6">Setări cont</h2>
                  <div className="space-y-6">
                    {/* Only show password change section for non-OAuth users */}
                    {!user?.googleId && !user?.facebookId && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Schimbă parola</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Parola actuală
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                              placeholder="Introdu parola actuală"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Parola nouă
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                              placeholder="Introdu parola nouă"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Confirmă parola nouă
                            </label>
                            <input
                              type="password"
                              className="w-full px-3 py-2 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                              placeholder="Confirmă parola nouă"
                            />
                          </div>
                          <button className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors">
                            Actualizează parola
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show OAuth info for Google/Facebook users */}
                    {user?.googleId && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Autentificare</h3>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Conectat cu Google
                              </p>
                              <p className="text-xs text-blue-700">
                                Parola este gestionată de Google
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {user?.facebookId && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Autentificare</h3>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Conectat cu Facebook
                              </p>
                              <p className="text-xs text-blue-700">
                                Parola este gestionată de Facebook
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`${user?.googleId || user?.facebookId ? 'border-t pt-6' : 'border-t pt-6'}`}>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Notificări</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm text-gray-700">Notificări email pentru comenzi</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          <span className="text-sm text-gray-700">Notificări pentru oferte speciale</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm text-gray-700">Newsletter săptămânal</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;