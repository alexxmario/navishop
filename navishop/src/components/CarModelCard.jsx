import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, ChevronRight } from 'lucide-react';
import { resolveImageUrl } from '../config/api';

const normalizeSpacing = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const encodeFolderForUrl = (folder = '') =>
  folder
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');

const stripBrandPrefix = (text = '', brand = '') => {
  const normalizedText = normalizeSpacing(text);
  const normalizedBrand = normalizeSpacing(brand);
  if (
    normalizedText.toLowerCase().startsWith(`${normalizedBrand.toLowerCase()} `)
  ) {
    return normalizedText.slice(normalizedBrand.length).trim();
  }
  return normalizedText;
};

const removeYearTokens = (value = '') =>
  value
    .replace(/\s*\(?\d{4}(?:\s*[-–]\s*\d{4}|-prezent)?\)?/gi, '')
    .replace(/\s*(?:dupa|pana)\s+\d{4}/gi, '')
    .trim();

const removeGenerationTokens = (value = '') =>
  value.replace(/\s+(?:[ivxlcdm]+|\d{1,2})$/i, '').trim();

const formatFolderCase = (value = '') =>
  value
    .split(' ')
    .map(word => {
      if (!word) return word;
      const isRomanNumeral = /^[ivxlcdm]+$/i.test(word);
      if (isRomanNumeral) {
        return word.toUpperCase();
      }
      return word.charAt(0).toLowerCase() + word.slice(1);
    })
    .join(' ');

// Manual folder overrides: normalized model name (lowercase) → actual folder name
const FOLDER_OVERRIDES = {
  'cmax 2': 'cmax 2 grand cmax',
};

const CarModelCard = ({ brand, modelData, modelKey }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // PNG-urile au ramas pe disc ca rezerva: daca un .webp lipseste, se reincearca .png
  // pe acelasi folder inainte de a trece la urmatorul candidat.
  const [useWebp, setUseWebp] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [variantIndex, setVariantIndex] = useState(0);

  const candidateFolders = useMemo(() => {
    const brandLower = brand.toLowerCase();
    const candidates = new Set();
    const years = modelData.years ? normalizeSpacing(modelData.years) : '';

    const addCandidate = (value) => {
      const normalized = normalizeSpacing(value);
      if (!normalized) return;
      candidates.add(normalized);
      candidates.add(normalized.toLowerCase());
      // "/" in model names (e.g. "Fit / Jazz") cannot appear in a folder path
      const slashless = normalizeSpacing(normalized.replace(/\s*\/\s*/g, ' '));
      if (slashless !== normalized) {
        candidates.add(slashless);
        candidates.add(slashless.toLowerCase());
      }
    };

    const addWithYears = (value) => {
      if (!value) return;
      addCandidate(value);
      if (years) {
        addCandidate(`${value} ${years}`);
      }
    };

    const addModelVariants = (value) => {
      if (!value) return;
      const variants = new Set();
      variants.add(value);
      variants.add(formatFolderCase(value));

      const withoutYears = removeYearTokens(value);
      if (withoutYears) {
        variants.add(withoutYears);
        variants.add(formatFolderCase(withoutYears));
      }

      const withoutGenerations = removeGenerationTokens(withoutYears);
      if (withoutGenerations) {
        variants.add(withoutGenerations);
        variants.add(formatFolderCase(withoutGenerations));
      }

      variants.forEach(variant => {
        if (variant) {
          addWithYears(variant);
        }
      });
    };

    // Primary: model name as returned by API (preserves case and hyphens)
    addModelVariants(stripBrandPrefix(modelData.model || '', brand));

    // Secondary: try slug-based model key (replace hyphens that separate words but keep numeric ranges)
    const slugModel = stripBrandPrefix(
      modelKey.replace(/-(?=[a-z])/gi, ' '),
      brand
    );
    addModelVariants(slugModel);

    // Fallback: raw slug without stripping brand
    addModelVariants(modelKey.replace(/-(?=[a-z])/gi, ' '));

    // Add folder overrides for candidates that have a manual mapping
    const expanded = new Set(candidates);
    for (const candidate of candidates) {
      const override = FOLDER_OVERRIDES[candidate.toLowerCase()];
      if (override) {
        expanded.add(override);
        if (years) expanded.add(`${override} ${years}`);
      }
    }

    return Array.from(expanded)
      .filter(Boolean)
      .map((folder) => ({
        brand: brandLower,
        folder
      }));
  }, [brand, modelData.model, modelData.years, modelKey]);

  useEffect(() => {
    setVariantIndex(0);
    setImageError(false);
    setImageLoaded(false);
    setUseWebp(true);
  }, [brand, modelData.model, modelData.years, modelKey]);

  const buildImagePath = (type = 'normal') => {
    const variant = candidateFolders[variantIndex];
    if (!variant) return '';
    const encodedFolder = encodeFolderForUrl(variant.folder);
    return resolveImageUrl(`/cars/${variant.brand}/${encodedFolder}/${type}.${useWebp ? 'webp' : 'png'}`);
  };

  const handleImageError = () => {
    if (useWebp) {
      setUseWebp(false);
      setImageLoaded(false);
    } else if (variantIndex < candidateFolders.length - 1) {
      setVariantIndex(prev => prev + 1);
      setUseWebp(true);
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
      className="bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-lg transition-all duration-200 group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onFocus={() => setIsHovered(true)}
    >
      <div className="aspect-video bg-white flex items-center justify-center relative overflow-hidden">
        {!imageError ? (
          <div className="relative w-full h-full">
            <img
              src={buildImagePath('normal')}
              alt={`${brand} ${modelData.model}`}
              className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-0"
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
            />
            {/* Imaginea de hover se cere abia la hover: o pagină de brand are până la
                65 de modele, iar încărcarea ambelor pentru fiecare card însemna ~130
                de PNG-uri de ~120 KB deodată. */}
            {imageLoaded && isHovered && (
              <img
                src={buildImagePath('flash')}
                alt={`${brand} ${modelData.model} with flash`}
                className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                loading="lazy"
                decoding="async"
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
      
      <div className="p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1 sm:mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {brand} {modelData.model}
        </h3>

        <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
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
