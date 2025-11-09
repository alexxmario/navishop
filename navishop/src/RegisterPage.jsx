import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from './services/api';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import {
  Eye, EyeOff, Mail, Lock, ArrowLeft, Phone, UserPlus
} from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Numele este obligatoriu';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Numele trebuie să aibă cel puțin 2 caractere';
    }
    
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
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmarea parolei este obligatorie';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Parolele nu se potrivesc';
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
      const data = await apiService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      console.log('Registration successful:', data);
      // Redirect to login page with success message
      window.location.href = '/login?registered=true';
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: error.message || 'Nu se poate conecta la server. Încercați din nou.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Înregistrare" />
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

          {/* Registration Form */}
          <div className="bg-white border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-light text-gray-900 mb-2">Înregistrează-te</h1>
              <p className="text-gray-600 text-sm">Creează un cont nou PilotOn</p>
            </div>

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nume complet
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      errors.name ? 'border-red-300' : 'border-gray-200'
                    } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                    placeholder="Numele și prenumele"
                  />
                  <UserPlus className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

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
                    placeholder="Minim 6 caractere"
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmă parola
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 border ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                    } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                    placeholder="Repetă parola"
                  />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
                  Sunt de acord cu{' '}
                  <button className="text-blue-600 hover:text-blue-700 underline">
                    Termenii și condițiile
                  </button>{' '}
                  și{' '}
                  <button className="text-blue-600 hover:text-blue-700 underline">
                    Politica de confidențialitate
                  </button>
                </label>
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
                {isLoading ? 'Se înregistrează...' : 'Înregistrează-te'}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Ai deja cont?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Conectează-te aici
                </Link>
              </p>
            </div>
          </div>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">Ai nevoie de ajutor?</p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <button className="flex items-center text-gray-600 hover:text-blue-600">
                <Phone className="w-4 h-4 mr-1" />
                0800 123 456
              </button>
              <button className="flex items-center text-gray-600 hover:text-blue-600">
                <Mail className="w-4 h-4 mr-1" />
                Suport
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;