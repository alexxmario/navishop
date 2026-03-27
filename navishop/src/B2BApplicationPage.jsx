import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageTitle from './components/PageTitle';
import Header from './components/Header';
import { buildApiUrl } from './config/api';
import {
  ArrowLeft, Building2, User, Mail, Phone, MapPin, FileText, CheckCircle
} from 'lucide-react';

const B2BApplicationPage = () => {
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    companyName: '',
    vatNumber: '',
    street: '',
    city: '',
    county: '',
    postalCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

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

    if (!formData.contactName) {
      newErrors.contactName = 'Numele persoanei de contact este obligatoriu';
    }

    if (!formData.email) {
      newErrors.email = 'Email-ul este obligatoriu';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email-ul nu este valid';
    }

    if (!formData.phone) {
      newErrors.phone = 'Telefonul este obligatoriu';
    } else if (!/^0[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Telefonul trebuie sa aiba 10 cifre';
    }

    if (!formData.companyName) {
      newErrors.companyName = 'Denumirea companiei este obligatorie';
    }

    if (!formData.vatNumber) {
      newErrors.vatNumber = 'CUI/CIF este obligatoriu';
    }

    if (!formData.street) {
      newErrors.street = 'Adresa este obligatorie';
    }

    if (!formData.city) {
      newErrors.city = 'Orasul este obligatoriu';
    }

    if (!formData.county) {
      newErrors.county = 'Judetul este obligatoriu';
    }

    if (!formData.postalCode) {
      newErrors.postalCode = 'Codul postal este obligatoriu';
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
      const response = await fetch(buildApiUrl('b2b-applications'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone.replace(/\s/g, ''),
          companyName: formData.companyName,
          vatNumber: formData.vatNumber,
          companyAddress: {
            street: formData.street,
            city: formData.city,
            county: formData.county,
            postalCode: formData.postalCode
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setErrors({ general: data.message || 'A aparut o eroare. Incercati din nou.' });
      }
    } catch (error) {
      console.error('B2B application error:', error);
      setErrors({ general: 'Nu se poate conecta la server. Incercati din nou.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageTitle title="Cont B2B" />
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white border border-gray-100 p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-light text-gray-900 mb-4">Cererea a fost trimisa!</h1>
              <p className="text-gray-600 mb-6">
                Multumim pentru interesul acordat. Cererea dumneavoastra va fi procesata in cel mai scurt timp si veti fi contactat la adresa de email furnizata.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Conturile B2B beneficiaza de reducere 20% la toate produsele.
              </p>
              <Link
                to="/"
                className="inline-block bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors"
              >
                Inapoi la magazin
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageTitle title="Cont B2B" />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <div className="mb-6">
            <Link to="/" className="flex items-center text-gray-600 hover:text-blue-600 text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Inapoi la magazin
            </Link>
          </div>

          {/* Application Form */}
          <div className="bg-white border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-light text-gray-900 mb-2">Solicita cont B2B</h1>
              <p className="text-gray-600 text-sm">
                Completeaza formularul pentru a solicita un cont de partener cu reducere 20% la toate produsele
              </p>
            </div>

            {/* Benefits */}
            <div className="bg-blue-50 border border-blue-100 p-4 mb-8">
              <h3 className="font-medium text-blue-900 mb-2">Beneficii cont B2B:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Reducere 20% la toate produsele</li>
                <li>• Acces la preturi speciale pentru comenzi mari</li>
                <li>• Suport dedicat pentru parteneri</li>
              </ul>
            </div>

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-gray-500" />
                  Informatii companie
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                      Denumirea companiei *
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border ${
                        errors.companyName ? 'border-red-300' : 'border-gray-200'
                      } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                      placeholder="SC Exemplu SRL"
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                    )}
                  </div>

                  {/* VAT Number */}
                  <div>
                    <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      CUI / CIF *
                    </label>
                    <div className="relative">
                      <input
                        id="vatNumber"
                        name="vatNumber"
                        type="text"
                        value={formData.vatNumber}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 border ${
                          errors.vatNumber ? 'border-red-300' : 'border-gray-200'
                        } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                        placeholder="RO12345678"
                      />
                      <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                    {errors.vatNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.vatNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-gray-500" />
                  Persoana de contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Name */}
                  <div className="md:col-span-2">
                    <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nume si prenume *
                    </label>
                    <input
                      id="contactName"
                      name="contactName"
                      type="text"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border ${
                        errors.contactName ? 'border-red-300' : 'border-gray-200'
                      } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                      placeholder="Ion Popescu"
                    />
                    {errors.contactName && (
                      <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
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
                        placeholder="contact@companie.ro"
                      />
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon *
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 border ${
                          errors.phone ? 'border-red-300' : 'border-gray-200'
                        } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                        placeholder="0712345678"
                      />
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                  Adresa sediului
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Street */}
                  <div className="md:col-span-2">
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                      Strada si numar *
                    </label>
                    <input
                      id="street"
                      name="street"
                      type="text"
                      value={formData.street}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border ${
                        errors.street ? 'border-red-300' : 'border-gray-200'
                      } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                      placeholder="Str. Exemplu nr. 10"
                    />
                    {errors.street && (
                      <p className="mt-1 text-sm text-red-600">{errors.street}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                      Oras *
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border ${
                        errors.city ? 'border-red-300' : 'border-gray-200'
                      } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                      placeholder="Bucuresti"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                    )}
                  </div>

                  {/* County */}
                  <div>
                    <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-2">
                      Judet *
                    </label>
                    <input
                      id="county"
                      name="county"
                      type="text"
                      value={formData.county}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border ${
                        errors.county ? 'border-red-300' : 'border-gray-200'
                      } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                      placeholder="Bucuresti"
                    />
                    {errors.county && (
                      <p className="mt-1 text-sm text-red-600">{errors.county}</p>
                    )}
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Cod postal *
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border ${
                        errors.postalCode ? 'border-red-300' : 'border-gray-200'
                      } focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600`}
                      placeholder="010101"
                    />
                    {errors.postalCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
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
                {isLoading ? 'Se trimite...' : 'Trimite cererea'}
              </button>
            </form>

            {/* Support */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-2">Ai intrebari?</p>
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
    </div>
  );
};

export default B2BApplicationPage;
