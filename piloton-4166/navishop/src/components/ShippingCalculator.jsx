import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Package, Clock, Calculator } from 'lucide-react';
import apiService from '../services/api';

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

  // Calculate shipping when address changes
  useEffect(() => {
    if (shippingAddress?.city && shippingAddress?.county) {
      calculateShipping();
    }
  }, [shippingAddress?.city, shippingAddress?.county, cartWeight, calculateShipping]);

  const calculateShipping = useCallback(async () => {
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

      if (response.success && response.services) {
        setShippingOptions(response.services);
        
        // Auto-select first option (usually Standard)
        if (response.services.length > 0) {
          const defaultOption = response.services[0];
          setSelectedShipping(defaultOption);
          onShippingUpdate?.({
            cost: defaultOption.price,
            service: defaultOption.name,
            estimatedDays: defaultOption.estimatedDays,
            estimatedDelivery: response.estimatedDelivery
          });
        }
      } else {
        // Fallback to basic calculation
        const basicShipping = calculateBasicShipping();
        setShippingOptions([basicShipping]);
        setSelectedShipping(basicShipping);
        onShippingUpdate?.(basicShipping);
      }
    } catch (error) {
      console.error('Shipping calculation error:', error);
      // Fallback to basic calculation
      const basicShipping = calculateBasicShipping();
      setShippingOptions([basicShipping]);
      setSelectedShipping(basicShipping);
      onShippingUpdate?.(basicShipping);
      setError('Nu s-a putut calcula costul de livrare. Se folosește tariful standard.');
    } finally {
      setLoading(false);
    }
  }, [shippingAddress, cartWeight, onShippingUpdate, calculateBasicShipping]);

  const calculateBasicShipping = useCallback(() => {
    // Basic shipping calculation (free over 500 RON, otherwise 25 RON)
    const basePrice = 25;
    return {
      name: 'Standard',
      price: basePrice,
      estimatedDays: 1,
      description: 'Livrare standard 1-2 zile lucratoare',
      cost: basePrice,
      service: 'Standard'
    };
  }, []);

  const handleShippingSelect = (option) => {
    setSelectedShipping(option);
    onShippingUpdate?.({
      cost: option.price,
      service: option.name,
      estimatedDays: option.estimatedDays,
      estimatedDelivery: option.estimatedDelivery
    });
  };

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
        <h3 className="font-semibold text-gray-900">Opțiuni de livrare</h3>
        {loading && (
          <div className="ml-auto flex items-center text-blue-600">
            <Calculator className="h-4 w-4 animate-spin mr-1" />
            <span className="text-sm">Calculez...</span>
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
                    {option.estimatedDays === 1 
                      ? 'Livrare în aceeași zi' 
                      : `${option.estimatedDays} zile lucratoare`}
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
                  {option.price.toFixed(2)} RON
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
              Livrare selectată: {selectedShipping.name} - {selectedShipping.price.toFixed(2)} RON
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;