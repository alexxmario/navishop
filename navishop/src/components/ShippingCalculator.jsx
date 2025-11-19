import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Package, Clock, Calculator } from 'lucide-react';
import apiService from '../services/api';

const calculateEstimatedDeliveryDate = (days = 2) => {
  const date = new Date();
  date.setDate(date.getDate() + (Number(days) || 2));
  return date.toISOString().split('T')[0];
};

const normalizeService = (service = {}) => {
  const price = Number(service.price ?? service.cost ?? service.total ?? 0);
  const name = service.name || service.service || 'Standard';
  const estimatedDays = Number(service.estimatedDays ?? service.deliveryDays ?? service.eta ?? 2) || 2;
  return {
    name,
    service: service.service || service.code || name,
    price,
    cost: price,
    vat: service.vat ?? service.tva ?? 0,
    currency: service.currency || 'RON',
    description: service.description || service.details || '',
    estimatedDays,
    estimatedDelivery: service.estimatedDelivery || calculateEstimatedDeliveryDate(estimatedDays)
  };
};

const fallbackOption = normalizeService({
  name: 'Standard FAN Courier',
  price: 25,
  description: 'Tarif estimativ FAN Courier',
  estimatedDays: 2
});

const testFreeOption = normalizeService({
  name: 'Test - Transport gratuit',
  service: 'fan_test_free',
  price: 0,
  description: 'Opțiune doar pentru testarea plăților EuPlătesc',
  estimatedDays: 2
});

const ShippingCalculator = ({ 
  shippingAddress, 
  cartWeight = 1, 
  onShippingUpdate, 
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [error, setError] = useState('');

  const updateSelection = useCallback((option) => {
    if (!option) return;
    setSelectedShipping(option);
    onShippingUpdate?.({
      cost: option.price ?? option.cost ?? 0,
      service: option.name || option.service,
      estimatedDays: option.estimatedDays,
      estimatedDelivery: option.estimatedDelivery
    });
  }, [onShippingUpdate]);

  const fetchShippingQuote = useCallback(async () => {
    if (!shippingAddress?.city || !shippingAddress?.county) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiService.getShippingQuote({
        city: shippingAddress.city,
        county: shippingAddress.county,
        weight: cartWeight
      });

      if (response.success) {
        const rawServices = response.services && response.services.length
          ? response.services
          : response.quote
            ? [response.quote]
            : [];

        const normalized = rawServices.map(normalizeService);
        const optionsWithTest = [...normalized, testFreeOption];

        if (!optionsWithTest.length) {
          throw new Error('No services returned from FAN Courier');
        }

        setShippingOptions(optionsWithTest);
        const preferred = optionsWithTest[0];
        updateSelection(preferred);
      } else {
        throw new Error(response.message || 'Unable to fetch FAN Courier tariffs');
      }
    } catch (err) {
      console.error('FAN Courier shipping quote error:', err);
      setError('Nu am putut obține tarifele FAN Courier. Se folosește tariful estimativ.');
      setShippingOptions([fallbackOption]);
      updateSelection(fallbackOption);
    } finally {
      setLoading(false);
    }
  }, [shippingAddress?.city, shippingAddress?.county, cartWeight, updateSelection]);

  useEffect(() => {
    fetchShippingQuote();
  }, [fetchShippingQuote]);

  const handleShippingSelect = (option) => {
    updateSelection(option);
  };

  const formatPrice = (value) => Number(value ?? 0).toFixed(2);

  if (!shippingAddress?.city) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-500">
          <Package className="h-5 w-5 mr-2" />
          <span>Completează adresa pentru a calcula costul de livrare</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center mb-4">
        <Truck className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="font-semibold text-gray-900">Tarife FAN Courier</h3>
        {loading && (
          <div className="ml-auto flex items-center text-blue-600">
            <Calculator className="h-4 w-4 animate-spin mr-1" />
            <span className="text-sm">Calculăm tariful...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {shippingOptions.map((option, index) => (
          <div
            key={index}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedShipping?.name === option.name
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleShippingSelect(option)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="shipping"
                  checked={selectedShipping?.name === option.name}
                  onChange={() => handleShippingSelect(option)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{option.name}</div>
                <div className="text-sm text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {(option.estimatedDays || 2) === 1 
                    ? 'Livrare în aceeași zi' 
                    : `${option.estimatedDays || 2} zile lucrătoare`}
                </div>
                {option.description && (
                  <div className="text-xs text-gray-400 mt-1">
                      {option.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {formatPrice(option.price)} RON
                </div>
                {option.estimatedDelivery && (
                  <div className="text-xs text-gray-500">
                    până pe {new Date(option.estimatedDelivery).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedShipping && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center text-green-800">
            <Package className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">
              Livrare selectată: {selectedShipping.name} - {formatPrice(selectedShipping.price)} RON
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;
