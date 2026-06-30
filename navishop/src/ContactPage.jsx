import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import logoSvg from './logo.svg';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import RecentlyViewed from './components/RecentlyViewed';
import { buildApiUrl } from './config/api';
import {
  Phone, Mail, MapPin, Clock, Send, MessageCircle,
  User, Car, Calendar, CheckCircle
} from 'lucide-react';

const ContactPage = () => {
  const { isAuthenticated } = useAuth();
  const { getCartItemsCount } = useCart();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    carBrand: '',
    carModel: '',
    year: '',
    subject: '',
    message: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(buildApiUrl('/contact-messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Eroare la trimiterea mesajului');
      }

      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        carBrand: '',
        carModel: '',
        year: '',
        subject: '',
        message: ''
      });
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (error) {
      setSubmitError(error.message || 'A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const carBrands = [
    'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Toyota', 'Ford',
    'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda', 'Mazda'
  ];

  const years = Array.from({ length: 20 }, (_, i) => 2024 - i);

  const subjects = [
    'Informații despre produse',
    'Programare instalare',
    'Service și garanție',
    'Suport tehnic',
    'Retur',
    'Reclamație',
    'Altele'
  ];

  // Allow other pages (e.g. the footer "Retur" link) to pre-select a subject
  // via ?subject=... as long as it matches one of the available options.
  useEffect(() => {
    const requestedSubject = searchParams.get('subject');
    if (requestedSubject && subjects.includes(requestedSubject)) {
      setFormData(prev => ({ ...prev, subject: requestedSubject }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Contact" />
      <Header />

      {/* Page Header */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-light mb-4 text-gray-900">
            Ia legătura cu <span className="text-blue-600">echipa noastră</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Suntem aici să te ajutăm să găsești navigația perfectă pentru mașina ta
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 border border-gray-100 h-fit">
              <h2 className="text-2xl font-light mb-8">Informații de contact</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Telefon</h3>
                    <p className="text-gray-600">0800 123 456</p>
                    <p className="text-gray-600">+40 722 123 456</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Email</h3>
                    <p className="text-gray-600">contact@piloton.ro</p>
                    <p className="text-gray-600">service@piloton.ro</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Adresă</h3>
                    <p className="text-gray-600">
                      Str. Nicolae Nicoleanu nr. 31<br />
                      Sector 1, București<br />
                      România
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Program</h3>
                    <div className="text-gray-600 text-sm space-y-1">
                      <p>Luni - Vineri: 09:00 - 18:00</p>
                      <p>Sâmbătă: 09:00 - 14:00</p>
                      <p>Duminică: Închis</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="font-medium mb-4">Contact rapid</h3>
                <div className="space-y-3">
                  <button className="w-full bg-blue-600 text-white py-3 px-4 hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Sună acum</span>
                  </button>
                  <button className="w-full bg-green-600 text-white py-3 px-4 hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 border border-gray-100">
              <h2 className="text-2xl font-light mb-8">Trimite-ne un mesaj</h2>
              
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-green-600">Mesaj trimis cu succes!</h3>
                  <p className="text-gray-600">Îți vom răspunde în cel mai scurt timp posibil.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-2" />
                        Nume complet *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Telefon
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  {/* Car Information */}
                  <div className="border-t pt-6">
                    <h3 className="font-medium mb-4 flex items-center">
                      <Car className="w-4 h-4 mr-2" />
                      Informații despre vehicul (opțional)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                        <select
                          name="carBrand"
                          value={formData.carBrand}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="">Selectează marca</option>
                          {carBrands.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                        <input
                          type="text"
                          name="carModel"
                          value={formData.carModel}
                          onChange={handleInputChange}
                          placeholder="ex. A4, Seria 3"
                          className="w-full p-3 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-2" />
                          An
                        </label>
                        <select
                          name="year"
                          value={formData.year}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="">Selectează anul</option>
                          {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subiect *</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      required
                    >
                      <option value="">Selectează subiectul</option>
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mesaj *</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows="6"
                      className="w-full p-3 border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      placeholder="Descrie-ne cum te putem ajuta..."
                      required
                    ></textarea>
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-3 px-6 hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Se trimite...' : 'Trimite mesajul'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Recently Viewed */}
      <RecentlyViewed />
    </div>
  );
};

export default ContactPage;
