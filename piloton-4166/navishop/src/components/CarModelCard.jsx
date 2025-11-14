import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, ChevronRight } from 'lucide-react';

const CarModelCard = ({ brand, modelData, modelKey }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  
  console.log(`Model Key: ${modelKey}, Model Name: ${modelData.model}`);

  const getCarImagePath = (type = 'normal', extension = 'png') => {
    const brandLower = brand.toLowerCase();
    const modelLower = modelKey.toLowerCase();
    console.log(`Looking for image: /cars/${brandLower}/${modelLower}/${type}.${extension}`);
    return `/cars/${brandLower}/${modelLower}/${type}.${extension}`;
  };

  const getCarImagePathFallback = (type = 'normal', extension = 'png') => {
    // Fallback: try with just the base model name (without years)
    const brandLower = brand.toLowerCase();
    const baseModelName = modelData.model.toLowerCase();
    console.log(`Fallback image search: /cars/${brandLower}/${baseModelName}/${type}.${extension}`);
    return `/cars/${brandLower}/${baseModelName}/${type}.${extension}`;
  };

  const formatYears = (years) => {
    if (!years) return '';
    return years;
  };

  return (
    <Link
      to={`/brand/${encodeURIComponent(brand)}/${encodeURIComponent(modelKey)}`}
      className="bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200 group overflow-hidden"
    >
      <div className="aspect-video bg-white flex items-center justify-center relative overflow-hidden">
        {!imageError ? (
          <div className="relative w-full h-full">
            <img
              src={useFallback ? getCarImagePathFallback('normal') : getCarImagePath('normal')}
              alt={`${brand} ${modelData.model}`}
              className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-0"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                if (!useFallback) {
                  setUseFallback(true);
                } else {
                  setImageError(true);
                }
              }}
            />
            {imageLoaded && (
              <img
                src={useFallback ? getCarImagePathFallback('flash') : getCarImagePath('flash')}
                alt={`${brand} ${modelData.model} with flash`}
                className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onError={() => {}}
              />
            )}
          </div>
        ) : (
          <>
            <Car className="w-12 h-12 text-gray-400 group-hover:text-blue-600 transition-colors" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {brand} {modelData.model}
        </h3>
        
        <div className="text-sm text-gray-600 mb-3">
          {formatYears(modelData.years)}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-600 font-medium">
            {modelData.productCount} {modelData.productCount === 1 ? 'produs' : 'produse'}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>
    </Link>
  );
};

export default CarModelCard;