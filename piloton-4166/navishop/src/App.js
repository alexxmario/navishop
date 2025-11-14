import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { RecentlyViewedProvider } from './RecentlyViewedContext';
import './styles/logo.css';
import HomePage from './HomePage';
import ProductPage from './ProductPage';
import ProductPageExperimental from './ProductPageExperimental';
import ContactPage from './ContactPage';
import CategoryPage from './CategoryPage';
import SearchResultsPage from './SearchResultsPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import DashboardPage from './DashboardPage';
import ProtectedRoute from './ProtectedRoute';
import CartPage from './CartPage';
import CheckoutPage from './CheckoutPage';
import TrackOrderPage from './TrackOrderPage';
import BrandPage from './BrandPage';
import ModelPage from './ModelPage';
import PaymentSuccessPage from './PaymentSuccessPage';
import PaymentCancelPage from './PaymentCancelPage';
import FanCourierTestPage from './FanCourierTestPage';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RecentlyViewedProvider>
          <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/product-experimental/:slug" element={<ProductPageExperimental />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/brand/:brand" element={<BrandPage />} />
            <Route path="/brand/:brand/:model" element={<ModelPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel" element={<PaymentCancelPage />} />
            <Route path="/fan-courier-test" element={<FanCourierTestPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
          </Router>
        </RecentlyViewedProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;


