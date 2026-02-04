import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import { buildApiUrl } from './config/api';
import {
  Eye, EyeOff, Mail, Lock, ArrowLeft, Phone
} from 'lucide-react';

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
      const response = await fetch(buildApiUrl('auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token, rememberMe);
        console.log('Login successful:', data);
        // Redirect to home page after login
        window.location.href = '/';
      } else {
        setErrors({ general: data.message || 'A apărut o eroare. Încercați din nou.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Nu se poate conecta la server. Încercați din nou.' });
    } finally {
      setIsLoading(false);
    }
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
