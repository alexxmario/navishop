const CAR_BRANDS = [
  'Alfa Romeo', 'Audi', 'BMW', 'Mercedes', 'Volkswagen', 'VW', 'Toyota',
  'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
  'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
  'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Land Rover',
  'Jaguar', 'Porsche', 'Mini', 'Smart', 'Suzuki', 'Isuzu', 'Infiniti',
  'Lexus', 'Acura', 'Genesis', 'DS', 'Cupra'
];

const YEAR_PATTERNS = [
  /^(.+?)\s+(\d{4}-\d{4})\s+/,   // Model YYYY-YYYY
  /^(.+?)\s+(dupa\s+\d{4})\s+/,  // Model dupa YYYY
  /^(.+?)\s+(pana\s+\d{4})\s+/,  // Model pana YYYY
  /^(.+?)\s+(\d{4}-prezent)\s+/, // Model YYYY-prezent
  /^(.+?)\s+(\(\d{4}-\d{4}\))\s+/, // Model (YYYY-YYYY)
  /^(.+?)\s+(\d{4})\s+/          // Model YYYY
];

const SPEC_PATTERNS = [
  /^(.+?)\s+\d+\s*inch\s+/i,
  /^(.+?)\s+\d+GB\s+/i,
  /^(.+?)\s+\d+K\s+/i,
  /^(.+?)\s+\d+\s+CORE\s*/i
];

const GENERATION_MODELS_REGEX = /^(CRV|Duster|Sandero|Logan|Outlander|Tucson|Sportage|Ceed|I10|I20|I30|Swift|Yaris|Corolla|Fiesta|Focus|Mondeo|Clio|Megane|308|5008|Octavia|Superb|Golf|Polo|Passat|Touran|Tiguan|Touareg)\s+\d+$/i;

const stripPrefix = (text = '', prefix = '') =>
  text.replace(new RegExp(`^${prefix}\\s+`, 'i'), '').trim();

const normalizeBrand = (brand) => {
  if (!brand) return null;
  return brand.toUpperCase() === 'VW' ? 'Volkswagen' : brand;
};

export const extractBrandModelInfo = (productName = '') => {
  const result = {
    brandLabel: null,
    brandSlug: null,
    modelLabel: null,
    modelSlug: null
  };

  if (!productName) return result;

  let cleanName = productName.replace(/^Navigatie\s+PilotOn\s+/i, '');

  let foundBrand = null;
  for (const brand of CAR_BRANDS) {
    const pattern = new RegExp(`^${brand}\\s+`, 'i');
    if (pattern.test(cleanName)) {
      foundBrand = brand;
      cleanName = cleanName.replace(pattern, '').trim();
      break;
    }
  }

  if (!foundBrand) {
    return result;
  }

  let baseModel = null;
  let years = null;

  for (const pattern of YEAR_PATTERNS) {
    const match = cleanName.match(pattern);
    if (match) {
      baseModel = match[1].trim();
      years = match[2].trim();
      break;
    }
  }

  if (!baseModel) {
    for (const pattern of SPEC_PATTERNS) {
      const match = cleanName.match(pattern);
      if (match) {
        baseModel = match[1].trim();
        break;
      }
    }
  }

  if (baseModel) {
    baseModel = baseModel.replace(/\s*dupa\s*/gi, '').trim();
  } else {
    baseModel = '';
  }

  if (years && GENERATION_MODELS_REGEX.test(baseModel)) {
    baseModel = baseModel.replace(/\s+\d+\s*$/, '').trim();
  }

  const normalizedBrand = normalizeBrand(foundBrand);
  const brandSlug = normalizedBrand ? normalizedBrand.toLowerCase() : null;

  const modelBase = baseModel.trim();
  const modelLabel = (modelBase || years)
    ? `${modelBase}${years ? ` ${years}` : ''}`.trim()
    : null;
  const modelSlug = modelBase
    ? `${modelBase.toLowerCase()} ${years || 'unknown'}`.trim()
    : null;

  return {
    brandLabel: normalizedBrand,
    brandSlug,
    modelLabel,
    modelSlug
  };
};
