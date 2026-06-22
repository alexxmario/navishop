import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { RecentlyViewedProvider } from './RecentlyViewedContext';
import './styles/logo.css';
import ProtectedRoute from './ProtectedRoute';
import CookieBanner from './components/CookieBanner';

const HomePage = lazy(() => import('./HomePage'));
const ProductPage = lazy(() => import('./ProductPage'));
const ProductPageExperimental = lazy(() => import('./ProductPageExperimental'));
const ContactPage = lazy(() => import('./ContactPage'));
const CategoryPage = lazy(() => import('./CategoryPage'));
const SearchResultsPage = lazy(() => import('./SearchResultsPage'));
const LoginPage = lazy(() => import('./LoginPage'));
const RegisterPage = lazy(() => import('./RegisterPage'));
const DashboardPage = lazy(() => import('./DashboardPage'));
const CartPage = lazy(() => import('./CartPage'));
const CheckoutPage = lazy(() => import('./CheckoutPage'));
const BrandPage = lazy(() => import('./BrandPage'));
const ModelPage = lazy(() => import('./ModelPage'));
const PaymentSuccessPage = lazy(() => import('./PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./PaymentCancelPage'));
const FanCourierTestPage = lazy(() => import('./FanCourierTestPage'));
const SalePage = lazy(() => import('./SalePage'));
const B2BApplicationPage = lazy(() => import('./B2BApplicationPage'));
const TermeniPage = lazy(() => import('./TermeniPage'));
const ConfidentialitatePage = lazy(() => import('./ConfidentialitatePage'));
const CookiesPage = lazy(() => import('./CookiesPage'));

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RecentlyViewedProvider>
          <Router>
          <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
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
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel" element={<PaymentCancelPage />} />
            <Route path="/fan-courier-test" element={<FanCourierTestPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/reduceri" element={<SalePage />} />
            <Route path="/b2b" element={<B2BApplicationPage />} />
            <Route path="/termeni" element={<TermeniPage />} />
            <Route path="/confidentialitate" element={<ConfidentialitatePage />} />
            <Route path="/cookies" element={<CookiesPage />} />
          </Routes>
          </Suspense>
          <CookieBanner />
          </Router>
        </RecentlyViewedProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
