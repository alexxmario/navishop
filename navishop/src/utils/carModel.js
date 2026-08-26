const CAR_BRANDS = [
  'Alfa Romeo', 'Audi', 'BMW', 'Mercedes Benz', 'Mercedes', 'Volkswagen', 'VW', 'Toyota',
  'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
  'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
  'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Land Rover',
  'Jaguar', 'Porsche', 'Mini', 'Smart', 'Suzuki', 'Isuzu', 'Iveco', 'Infiniti',
  'Lexus', 'Acura', 'Genesis', 'Cadillac', 'DS', 'Cupra',
  // Lista trebuie să rămână aliniată cu carBrands din
  // backend/services/brandModelExtractor.js, altfel breadcrumb-ul trimite spre o
  // pagină de marcă pe care backendul nu o construiește. Ca și acolo, 'Rover' stă
  // după 'Land Rover': se oprește la prima potrivire și i-ar înghiți modelele.
  'Dodge', 'Chrysler', 'SsangYong', 'Rover'
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

// Infotainment system codes (BMW iDrive variants etc.) that clutter the model
// name. They should not appear as their own word in breadcrumbs / model labels.
const IGNORED_MODEL_TOKENS = ['CIC', 'CCC', 'EVO', 'NBT'];
const IGNORED_MODEL_TOKENS_REGEX = new RegExp(
  `\\b(?:${IGNORED_MODEL_TOKENS.join('|')})\\b`,
  'gi'
);

const GENERATION_MODELS_REGEX = /^(CRV|Duster|Sandero|Logan|Outlander|Tucson|Sportage|Ceed|I10|I20|I30|Swift|Yaris|Corolla|Fiesta|Focus|Mondeo|Clio|Megane|308|5008|Octavia|Superb|Golf|Polo|Passat|Touran|Tiguan|Touareg)\s+\d+$/i;

const stripPrefix = (text = '', prefix = '') =>
  text.replace(new RegExp(`^${prefix}\\s+`, 'i'), '').trim();

const normalizeBrand = (brand) => {
  if (!brand) return null;
  if (brand.toUpperCase() === 'VW') return 'Volkswagen';
  if (brand.toLowerCase() === 'mercedes') return 'Mercedes Benz';
  return brand;
};

export const extractBrandModelInfo = (productName = '') => {
  const result = {
    brandLabel: null,
    brandSlug: null,
    modelLabel: null,
    modelSlug: null
  };

  if (!productName) return result;

  // Navigațiile verticale de 9.7" au marcajul "Tip Tesla" între prefix și marcă. Fără
  // să-l scoatem, numele nu începe cu nicio marcă, extragerea iese goală, iar
  // breadcrumb-ul rămâne "Acasă > <numele întreg>", fără marcă și fără model.
  let cleanName = productName
    .replace(/^Navigatie\s+PilotOn\s+/i, '')
    .replace(/^Tip\s+Tesla\s+/i, '');

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

  // Drop infotainment system codes (CIC/CCC/EVO/NBT) wherever they appear.
  baseModel = baseModel
    .replace(IGNORED_MODEL_TOKENS_REGEX, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

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
