import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, ChevronRight } from 'lucide-react';
import { resolveImageUrl } from '../config/api';

const sanitizeFolder = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const encodeFolderForUrl = (folder = '') =>
  folder
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');

const stripBrandPrefix = (text = '', brand = '') => {
  const lowerText = text.toLowerCase();
  const lowerBrand = brand.toLowerCase();
  if (lowerText.startsWith(`${lowerBrand} `)) {
    return text.slice(brand.length).trim();
  }
  return text.trim();
};

const CarModelCard = ({ brand, modelData, modelKey }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  const candidateFolders = useMemo(() => {
    const brandLower = brand.toLowerCase();
    const candidates = new Set();

    const baseFromKey = sanitizeFolder(
      stripBrandPrefix(modelKey.replace(/-/g, ' '), brand)
    );
    const baseFromModel = sanitizeFolder(
      stripBrandPrefix(modelData.model || '', brand)
    );
    const years = modelData.years ? modelData.years.trim() : '';

    if (baseFromKey) candidates.add(baseFromKey);
    if (baseFromModel) candidates.add(baseFromModel);
    if (baseFromKey && years) candidates.add(`${baseFromKey} ${years}`.trim());
    if (baseFromModel && years) candidates.add(`${baseFromModel} ${years}`.trim());

    // Include original key/model (before removing brand) as last resort
    const rawKey = sanitizeFolder(modelKey.replace(/-/g, ' '));
    if (rawKey) candidates.add(rawKey);
    const rawModel = sanitizeFolder(modelData.model || '');
    if (rawModel) candidates.add(rawModel);

    return Array.from(candidates).map(folder => ({
      brand: brandLower,
      folder
    }));
  }, [brand, modelData.model, modelData.years, modelKey]);

  useEffect(() => {
    setVariantIndex(0);
    setImageError(false);
    setImageLoaded(false);
  }, [brand, modelData.model, modelData.years, modelKey]);

  const buildImagePath = (type = 'normal') => {
    const variant = candidateFolders[variantIndex];
    if (!variant) return '';
    const encodedFolder = encodeFolderForUrl(variant.folder);
    return resolveImageUrl(`/cars/${variant.brand}/${encodedFolder}/${type}.png`);
  };

  const handleImageError = () => {
    if (variantIndex < candidateFolders.length - 1) {
      setVariantIndex(prev => prev + 1);
      setImageLoaded(false);
    } else {
      setImageError(true);
    }
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
              src={buildImagePath('normal')}
              alt={`${brand} ${modelData.model}`}
              className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-0"
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
            />
            {imageLoaded && (
              <img
                src={buildImagePath('flash')}
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
