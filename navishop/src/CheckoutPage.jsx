import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import apiService from './services/api';
import PageTitle from './components/PageTitle';
import ShippingCalculator from './components/ShippingCalculator';
import { useB2BPricing } from './hooks/useB2BPricing';
import {
  ArrowLeft, CreditCard, Truck, Shield, MapPin, User,
  CheckCircle, AlertCircle, Clock
} from 'lucide-react';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, clearCart, getCartTotal } = useCart();
  const { user } = useAuth();
  const { isBusinessAccount, calculateCartTotal, calculateB2BSavings, discountPercent } = useB2BPricing();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [shippingInfo, setShippingInfo] = useState({
    cost: 25,
    service: 'Standard',
    estimatedDays: 1
  });
  
  // Form state
  const [formData, setFormData] = useState({
    // Guest or user info
    guestName: user?.name || '',
    guestEmail: user?.email || '',
    guestPhone: user?.phone || '',

    // Invoice type: 'person' or 'company'
    invoiceType: isBusinessAccount ? 'company' : 'person',

    // Company details (for invoiceType === 'company')
    companyDetails: {
      companyName: user?.businessDetails?.companyName || '',
      cui: user?.businessDetails?.vatNumber || '',
      regCom: '',
      bank: '',
      bankAccount: ''
    },

    // Shipping address
    shippingAddress: {
      street: '',
      city: '',
      county: '',
      postalCode: '',
      country: 'România'
    },

    // Billing address
    billingAddress: {
      street: '',
      city: '',
      county: '',
      postalCode: '',
      country: 'România',
      sameAsShipping: true
    },

    paymentMethod: 'cash_on_delivery',
    notes: ''
  });

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('shipping.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: value
        }
      }));
    } else if (name.startsWith('billing.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [field]: value
        }
      }));
    } else if (name.startsWith('company.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        companyDetails: {
          ...prev.companyDetails,
          [field]: value
        }
      }));
    } else if (name === 'sameAsShipping') {
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          sameAsShipping: checked,
          ...(checked ? prev.shippingAddress : {})
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validateForm = () => {
    const { guestName, guestEmail, guestPhone, shippingAddress, invoiceType, companyDetails } = formData;

    if (!guestName.trim()) return 'Numele este obligatoriu';
    if (!guestEmail.trim()) return 'Email-ul este obligatoriu';
    if (!guestPhone.trim()) return 'Telefonul este obligatoriu';
    if (!shippingAddress.street.trim()) return 'Adresa este obligatorie';
    if (!shippingAddress.city.trim()) return 'Orașul este obligatoriu';
    if (!shippingAddress.county.trim()) return 'Județul este obligatoriu';
    if (!shippingAddress.postalCode.trim()) return 'Codul poștal este obligatoriu';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) return 'Email-ul nu este valid';

    // Phone validation - STRICT: exactly 10 digits starting with 0 (Romanian format: 07xxxxxxxx)
    const cleanPhone = guestPhone.replace(/\s/g, '');
    if (!/^0\d{9}$/.test(cleanPhone)) return 'Telefonul trebuie să aibă exact 10 cifre începând cu 0 (ex: 0712345678)';

    // Company validation for invoiceType === 'company'
    if (invoiceType === 'company') {
      if (!companyDetails.companyName.trim()) return 'Numele firmei este obligatoriu';
      if (!companyDetails.cui.trim()) return 'CUI/CIF este obligatoriu';
    }

    return null;
  };

  const calculateShipping = useCallback(() => {
    const total = isBusinessAccount ? calculateCartTotal(cartItems) : getCartTotal();
    if (total >= 500) {
      return 0;
    }
    return shippingInfo?.cost || 0;
  }, [isBusinessAccount, calculateCartTotal, cartItems, getCartTotal, shippingInfo]);

  const calculateGrandTotal = useCallback(() => {
    const orderTotal = isBusinessAccount ? calculateCartTotal(cartItems) : getCartTotal();
    return orderTotal + calculateShipping();
  }, [isBusinessAccount, calculateCartTotal, cartItems, getCartTotal, calculateShipping]);

  const handleShippingUpdate = useCallback((shipping) => {
    setShippingInfo(shipping);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Normalize phone to 10 digits (07xxxxxxxx format)
      const normalizedPhone = formData.guestPhone.replace(/\s/g, '').replace(/^\+?4?0?/, '0');

      // Include name and phone in shippingAddress for FAN Courier AWB
      const shippingAddressWithContact = {
        ...formData.shippingAddress,
        name: formData.guestName,
        phone: normalizedPhone
      };

      // Prepare invoice data
      const invoiceData = {
        invoiceType: formData.invoiceType,
        ...(formData.invoiceType === 'company' && {
          companyDetails: {
            companyName: formData.companyDetails.companyName,
            cui: formData.companyDetails.cui,
            regCom: formData.companyDetails.regCom || '',
            bank: formData.companyDetails.bank || '',
            bankAccount: formData.companyDetails.bankAccount || ''
          }
        })
      };

      // Prepare common order data
      const baseOrderData = {
        items: cartItems.map(item => ({
          productId: item.productId || item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        shippingAddress: shippingAddressWithContact,
        billingAddress: formData.billingAddress.sameAsShipping
          ? shippingAddressWithContact
          : formData.billingAddress,
        paymentMethod: formData.paymentMethod,
        shippingOption: shippingInfo,
        shippingCost: calculateShipping(),
        notes: formData.notes,
        invoiceData
      };

      // Add guest information only for guest orders
      const orderData = user ? baseOrderData : {
        ...baseOrderData,
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: normalizedPhone
      };

      console.log('Submitting order:', orderData);
      console.log('User authenticated:', !!user);

      // Create order based on authentication status
      const result = user 
        ? await apiService.createUserOrder(orderData)
        : await apiService.createGuestOrder(orderData);
      
      // If payment URL is provided (for online payments), redirect to payment
      if (result.order.paymentURL) {
        window.location.href = result.order.paymentURL;
        return;
      }
      
      setOrderResult(result.order);
      setSuccess(true);
      
      // Clear the cart
      await clearCart();
      
      // Clear localStorage cart as well
      localStorage.removeItem('localCart');
      
    } catch (error) {
      console.error('Order creation failed:', error);
      setError(error.message || 'A apărut o eroare la plasarea comenzii. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  if (success && orderResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Comandă plasată cu succes!
            </h1>
            <p className="text-gray-600 mb-6">
              Mulțumim pentru comandă! Vei primi un email de confirmare în scurt timp.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Detalii comandă</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Număr comandă:</span>
                  <span className="font-mono font-semibold">{orderResult.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{orderResult.guestEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total comandă:</span>
                  <span>{orderResult.orderTotal} lei</span>
                </div>
                <div className="flex justify-between">
                  <span>Livrare:</span>
                  <span>{orderResult.shippingCost} lei</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total plată:</span>
                  <span>{orderResult.grandTotal} lei</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
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
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/cart" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi la coș
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Finalizare comandă</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Informații de contact
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nume complet *
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      value={formData.guestName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ion Popescu"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="guestEmail"
                      value={formData.guestEmail}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ion.popescu@email.com"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                        +4
                      </span>
                      <input
                        type="tel"
                        name="guestPhone"
                        value={formData.guestPhone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0712345678"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Type */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Factură pe
                </h2>

                <div className="flex gap-4 mb-6">
                  <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${
                    formData.invoiceType === 'person'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isBusinessAccount ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="radio"
                      name="invoiceType"
                      value="person"
                      checked={formData.invoiceType === 'person'}
                      onChange={handleInputChange}
                      disabled={isBusinessAccount}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-center">
                      <User className="w-5 h-5 mr-2" />
                      <span className="font-medium">Persoană fizică</span>
                    </div>
                  </label>

                  <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${
                    formData.invoiceType === 'company'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="invoiceType"
                      value="company"
                      checked={formData.invoiceType === 'company'}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      <span className="font-medium">Persoană juridică</span>
                    </div>
                  </label>
                </div>

                {isBusinessAccount && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    Contul tău B2B necesită factură pe persoană juridică.
                  </div>
                )}

                {/* Company Details */}
                {formData.invoiceType === 'company' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Denumire firmă *
                      </label>
                      <input
                        type="text"
                        name="company.companyName"
                        value={formData.companyDetails.companyName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="SC Exemplu SRL"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CUI / CIF *
                      </label>
                      <input
                        type="text"
                        name="company.cui"
                        value={formData.companyDetails.cui}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="RO12345678"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nr. Reg. Comerțului
                      </label>
                      <input
                        type="text"
                        name="company.regCom"
                        value={formData.companyDetails.regCom}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="J40/1234/2020"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bancă
                      </label>
                      <input
                        type="text"
                        name="company.bank"
                        value={formData.companyDetails.bank}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Banca Transilvania"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cont bancar (IBAN)
                      </label>
                      <input
                        type="text"
                        name="company.bankAccount"
                        value={formData.companyDetails.bankAccount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="RO49AAAA1B31007593840000"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Adresa de livrare
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresa completă *
                    </label>
                    <input
                      type="text"
                      name="shipping.street"
                      value={formData.shippingAddress.street}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Str. Exemplu, nr. 123, bl. A, sc. 1, et. 2, ap. 34"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Oraș *
                    </label>
                    <input
                      type="text"
                      name="shipping.city"
                      value={formData.shippingAddress.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="București"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Județ *
                    </label>
                    <input
                      type="text"
                      name="shipping.county"
                      value={formData.shippingAddress.county}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ilfov"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cod poștal *
                    </label>
                    <input
                      type="text"
                      name="shipping.postalCode"
                      value={formData.shippingAddress.postalCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123456"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Țara
                    </label>
                    <input
                      type="text"
                      name="shipping.country"
                      value={formData.shippingAddress.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Calculator */}
              <ShippingCalculator
                shippingAddress={formData.shippingAddress}
                cartWeight={cartItems.reduce((total, item) => total + (item.quantity * 0.5), 1)}
                onShippingUpdate={handleShippingUpdate}
                className="mb-6"
              />

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Metoda de plată
                </h2>
                
                <div className="space-y-4">
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked={formData.paymentMethod === 'cash_on_delivery'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        Plată la livrare
                      </div>
                      <div className="text-sm text-gray-500">
                        Plătești când primești produsele
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        Plată online cu cardul (EuPlătesc)
                      </div>
                      <div className="text-sm text-gray-500">
                        Plată securizată
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={formData.paymentMethod === 'bank_transfer'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        Transfer bancar
                      </div>
                      <div className="text-sm text-gray-500">
                        Vei primi detaliile pentru transfer
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="smartbill_transfer"
                      checked={formData.paymentMethod === 'smartbill_transfer'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        Transfer bancar cu factură
                      </div>
                      <div className="text-sm text-gray-500">
                        Primești factură și detalii pentru transfer
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Observații (opțional)
                </h2>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observații speciale pentru livrare..."
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Se procesează...' : 'Plasează comanda'}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Rezumatul comenzii
              </h2>
              
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => {
                  const { formatPriceDisplay } = { formatPriceDisplay: (price) => {
                    if (!isBusinessAccount || !price) return { currentPrice: price };
                    const discountRate = discountPercent / 100;
                    const discountedPrice = price * (1 - discountRate);
                    return { currentPrice: Math.round(discountedPrice * 100) / 100 };
                  }};
                  const priceInfo = formatPriceDisplay(item.price);
                  const displayPrice = isBusinessAccount ? priceInfo.currentPrice : item.price;

                  return (
                    <div key={item.productId || item._id} className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} x {displayPrice} lei
                          {isBusinessAccount && (
                            <span className="ml-1 text-xs text-blue-600">(B2B)</span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {(displayPrice * item.quantity).toFixed(2)} lei
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t border-gray-200 pt-4 space-y-2">
                {!isBusinessAccount && (
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{getCartTotal().toFixed(2)} lei</span>
                  </div>
                )}
                {isBusinessAccount && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal (preț standard):</span>
                      <span className="line-through text-gray-500">{getCartTotal().toFixed(2)} lei</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Reducere B2B ({discountPercent}%):</span>
                      <span>-{calculateB2BSavings(cartItems).toFixed(2)} lei</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Subtotal B2B:</span>
                      <span>{calculateCartTotal(cartItems).toFixed(2)} lei</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span>Livrare ({shippingInfo.service}):</span>
                  <span>{calculateShipping().toFixed(2)} lei</span>
                </div>
                {calculateShipping() === 0 ? (
                  <div className="flex items-center text-sm text-green-600">
                    <Truck className="w-4 h-4 mr-1" />
                    Livrare gratuită!
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    Estimat: {shippingInfo.estimatedDays} zi{shippingInfo.estimatedDays !== 1 ? 'le' : ''} lucrătoare
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>{calculateGrandTotal().toFixed(2)} lei</span>
                </div>
                {isBusinessAccount && (
                  <div className="text-xs text-blue-600 flex items-center justify-end">
                    <span className="bg-blue-100 px-2 py-1 rounded">Preț B2B aplicat</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-blue-600" />
                  Plata securizată
                </div>
                <div className="flex items-center">
                  <Truck className="w-4 h-4 mr-2 text-blue-600" />
                  Livrare în 2-3 zile lucrătoare
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
