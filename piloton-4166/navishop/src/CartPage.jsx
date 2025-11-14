import React, { useState } from 'react';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import { Link } from 'react-router-dom';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import {
  ShoppingCart, ArrowLeft, Plus, Minus, Trash2, Heart,
  Truck, Shield, Check, Phone, Mail, CreditCard, Tag
} from 'lucide-react';

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartItemsCount, getCartTotal } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [promoCode, setPromoCode] = useState('');

  const removeItem = async (id) => {
    try {
      await removeFromCart(id);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const moveToWishlist = (id) => {
    // Implementation for moving to wishlist
    removeItem(id);
  };

  const subtotal = getCartTotal();
  const savings = cartItems.reduce((sum, item) => {
    if (item.oldPrice) {
      return sum + ((item.oldPrice - item.price) * item.quantity);
    }
    return sum;
  }, 0);
  const shipping = subtotal >= 500 ? 0 : 29;
  const total = subtotal + shipping;

  const CartItem = ({ item }) => (
    <div className="flex flex-col md:flex-row bg-white border border-gray-100 p-6 space-y-4 md:space-y-0">
      {/* Product Image */}
      <div className="w-full md:w-32 h-32 bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
        <Link to={`/product/${item.slug || item.productId}`} className="w-full h-full flex items-center justify-center">
          {item.images && item.images.length > 0 ? (
            <img 
              src={item.images[0].url} 
              alt={item.images[0].alt || item.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-100 rounded border border-blue-200 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          )}
        </Link>
      </div>

      {/* Product Info */}
      <div className="flex-1 md:ml-6">
        <div className="flex flex-col md:flex-row md:justify-between">
          <div className="flex-1">
            <Link to={`/product/${item.slug || item.productId}`} className="hover:text-blue-600 transition-colors">
              <h3 className="font-medium text-gray-900 mb-1 hover:text-blue-600">{item.name}</h3>
            </Link>
            <p className="text-sm text-gray-600 mb-2">{item.compatibility}</p>
            <div className="flex items-center space-x-2 mb-4">
              <span className="font-semibold text-gray-900">{item.price} lei</span>
              {item.oldPrice && (
                <span className="text-sm text-gray-500 line-through">{item.oldPrice} lei</span>
              )}
              {item.oldPrice && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Economii: {item.oldPrice - item.price} lei
                </span>
              )}
            </div>
            <p className="text-sm text-blue-600">În stoc</p>
          </div>

          {/* Quantity and Actions */}
          <div className="flex flex-col md:items-end space-y-4 mt-4 md:mt-0">
            {/* Quantity Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Cantitate:</span>
              <div className="flex items-center border border-gray-200">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="p-2 hover:bg-gray-50 text-gray-600"
                  disabled={item.quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-center min-w-[3rem]">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="p-2 hover:bg-gray-50 text-gray-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Item Total */}
            <div className="text-right">
              <p className="font-semibold text-lg">{item.price * item.quantity} lei</p>
              {item.oldPrice && (
                <p className="text-sm text-gray-500 line-through">
                  {item.oldPrice * item.quantity} lei
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => moveToWishlist(item.productId)}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600"
              >
                <Heart className="w-4 h-4" />
                <span>Salvează</span>
              </button>
              <button
                onClick={() => removeItem(item.productId)}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>Șterge</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Coșul de cumpărături" />
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-blue-600">Acasă</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">Coșul de cumpărături</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center mb-8">
          <Link to="/" className="text-gray-600 hover:text-blue-600 mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-light text-gray-900">Coșul de cumpărături</h1>
          <span className="ml-4 text-gray-500">({cartItems.length} {cartItems.length === 1 ? 'produs' : 'produse'})</span>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-light text-gray-900 mb-4">Coșul tău este gol</h2>
            <p className="text-gray-600 mb-8">Adaugă produse pentru a începe cumpărăturile</p>
            <Link
              to="/"
              className="inline-flex items-center bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors"
            >
              Începe cumpărăturile
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Free Shipping Banner */}
              {subtotal < 500 && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <div className="flex items-center">
                    <Truck className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-blue-800">
                        Adaugă încă <strong>{500 - subtotal} lei</strong> pentru livrare gratuită!
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${(subtotal / 500) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              {cartItems.map(item => (
                <CartItem key={item.id} item={item} />
              ))}

              {/* Continue Shopping */}
              <div className="pt-6">
                <Link
                  to="/"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continuă cumpărăturile
                </Link>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-100 p-6 sticky top-24">
                <h2 className="text-xl font-medium mb-6">Sumar comandă</h2>

                {/* Promo Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cod promotional
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Introdu codul"
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                      <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                      Aplică
                    </button>
                  </div>
                </div>

                {/* Order Summary Details */}
                <div className="space-y-3 pb-4 border-b border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({cartItems.length} {cartItems.length === 1 ? 'produs' : 'produse'})</span>
                    <span className="font-medium">{subtotal} lei</span>
                  </div>
                  
                  {savings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Economii</span>
                      <span>-{savings} lei</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Livrare</span>
                    <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                      {shipping === 0 ? 'Gratuită' : `${shipping} lei`}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-semibold pt-4 mb-6">
                  <span>Total</span>
                  <span>{total} lei</span>
                </div>

                {/* Checkout Button */}
                <Link 
                  to="/checkout"
                  className="block w-full bg-blue-600 text-white py-3 hover:bg-blue-700 transition-colors font-medium mb-4 text-center"
                >
                  Continuă către checkout
                </Link>

                {/* Payment Methods */}
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600 mb-3">Metode de plată acceptate:</p>
                  <div className="flex justify-center space-x-2">
                    <div className="w-8 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div className="w-8 h-6 bg-gray-100 rounded"></div>
                    <div className="w-8 h-6 bg-gray-100 rounded"></div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Shield className="w-4 h-4 mr-2 text-green-600" />
                    <span>Plăți securizate SSL</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Truck className="w-4 h-4 mr-2 text-blue-600" />
                    <span>Livrare în 1-3 zile lucrătoare</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    <span>Garanție 3 ani</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 mt-16">
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

export default CartPage;