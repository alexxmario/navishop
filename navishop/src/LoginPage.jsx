import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import {
  Eye, EyeOff, Mail, Lock, ArrowLeft, Phone
} from 'lucide-react';
import apiService from './services/api';
import { API_BASE_URL } from './config/env';

const LoginPage = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Check if user was redirected from registration or OAuth
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
      setSuccessMessage('Contul a fost creat cu succes! Te poți conecta acum.');
    }
    
    // Handle OAuth errors
    const error = urlParams.get('error');
    if (error === 'auth_failed') {
      setErrors({ general: 'Autentificarea a eșuat. Încercați din nou.' });
    } else if (error === 'google_not_configured') {
      setErrors({ general: 'Autentificarea cu Google nu este configurată momentan.' });
    } else if (error === 'facebook_not_configured') {
      setErrors({ general: 'Autentificarea cu Facebook nu este configurată momentan.' });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email-ul nu este valid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Parola este obligatorie';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Parola trebuie să aibă cel puțin 6 caractere';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const data = await apiService.login({
        email: formData.email,
        password: formData.password
      });

      login(data.user, data.token, rememberMe);
      window.location.href = '/';
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: error.message || 'Nu se poate conecta la server. Încercați din nou.' });
    } finally {
      setIsLoading(false);
    }
  };

  const apiBase = API_BASE_URL?.replace(/\/$/, '') || '/api';
  const handleGoogleLogin = () => {
    window.location.href = `${apiBase}/auth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${apiBase}/auth/facebook`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Autentificare" />
      <Header />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Back Link */}
          <div className="mb-6">
            <Link to="/" className="flex items-center text-gray-600 hover:text-blue-600 text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi la magazin
            </Link>
          </div>

          {/* Login Form */}
          <div className="bg-white border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-light text-gray-900 mb-2">Conectează-te</h1>
              <p className="text-gray-600 text-sm">Accesează contul tău PilotOn</p>
            </div>

            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm">
                {successMessage}
              </div>
            )}

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      errors.email ? 'border-red-300' : 'border-gray-200'
                    } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                    placeholder="exemplu@email.com"
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Parola
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border ${
                      errors.password ? 'border-red-300' : 'border-gray-200'
                    } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                    placeholder="Introdu parola"
                  />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ține-mă conectat</span>
                </label>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Am uitat parola
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 font-medium transition-colors ${
                  isLoading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Se conectează...' : 'Conectează-te'}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">sau</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="mt-6 space-y-3">
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">Conectează-te cu Google</span>
              </button>
              
              <button 
                onClick={handleFacebookLogin}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">Continuă cu Facebook</span>
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Nu ai cont?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                  Înregistrează-te aici
                </Link>
              </p>
            </div>
          </div>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">Ai nevoie de ajutor?</p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <a href="#" className="flex items-center text-gray-600 hover:text-blue-600">
                <Phone className="w-4 h-4 mr-1" />
                0800 123 456
              </a>
              <a href="#" className="flex items-center text-gray-600 hover:text-blue-600">
                <Mail className="w-4 h-4 mr-1" />
                Suport
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
