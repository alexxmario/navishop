const Product = require('../models/Product');

// Extragerea marcilor parcurge toate produsele active si ruleaza regex-uri pe fiecare
// nume. La ~8000 de produse asta insemna ~10s per cerere, iar /api/brands si
// /api/brands/:brand o apelau amandoua. Marcile se schimba rar, deci se tine in memorie.
let brandsCache = { data: null, at: 0 };
const BRANDS_TTL_MS = 10 * 60 * 1000;

class BrandModelExtractor {
  constructor() {
    // Common car brands to look for in product names
    this.carBrands = [
      'Alfa Romeo', 'Audi', 'BMW', 'Mercedes Benz', 'Mercedes', 'Volkswagen', 'VW', 'Toyota',
      'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
      'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
      'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Land Rover',
      'Jaguar', 'Porsche', 'Mini', 'Smart', 'Suzuki', 'Isuzu', 'Iveco', 'Infiniti',
      'Lexus', 'Acura', 'Genesis', 'Cadillac', 'DS', 'Cupra',
      // Lista e parcursă în ordine și se oprește la prima potrivire, așa că 'Rover'
      // trebuie să rămână după 'Land Rover', altfel ar înghiți modelele Land Rover.
      'Dodge', 'Chrysler', 'SsangYong', 'Rover'
    ];

    // Head unit / infotainment system identifiers to ignore in model names
    // These are technical specs, not model identifiers
    this.headUnitIdentifiers = [
      'CCC',   // BMW Car Communication Computer
      'CIC',   // BMW Car Information Computer
      'NBT',   // BMW Next Big Thing
      'EVO',   // BMW Evolution
      'NBTEVO', // Combined NBT EVO
      'ID4',   // VW ID4 infotainment
      'ID5',   // VW ID5 infotainment
      'ID6',   // VW ID6 infotainment
      'ID7',   // VW ID7 infotainment
      'ID8',   // VW ID8 infotainment
      'MIB',   // VW Modular Infotainment Matrix
      'MIB2',  // VW MIB2
      'MIB3',  // VW MIB3
      'RNS',   // VW Radio Navigation System
      'RCD',   // VW Radio CD
      'MMI',   // Audi Multi Media Interface
      'MHI',   // Audi Media High Interface
      'COMAND', // Mercedes Command
      'NTG',   // Mercedes NTG
      'MBUX',  // Mercedes MBUX
    ];
  }

  // Remove head unit identifiers from model name
  removeHeadUnitIdentifiers(modelName) {
    if (!modelName) return modelName;

    let cleaned = modelName;
    for (const identifier of this.headUnitIdentifiers) {
      // Remove identifier as whole word (case insensitive)
      const pattern = new RegExp(`\\b${identifier}\\b`, 'gi');
      cleaned = cleaned.replace(pattern, '');
    }

    // Clean up extra spaces
    return cleaned.replace(/\s+/g, ' ').trim();
  }

  // Models where Roman numeral-like letters are part of the actual name
  // and should NOT be converted to numbers
  romanNumeralExceptions = ['X-Trail', 'X Trail', 'XTrail', '500 X', '500X', 'Daily IV', 'Daily V', 'Daily VI'];

  // Normalize model name: convert Roman numerals to Arabic, remove hyphens
  normalizeModelName(modelName) {
    if (!modelName) return modelName;

    // Check if the model name contains any exception — skip Roman numeral conversion if so
    const upperName = modelName.toUpperCase();
    const hasException = this.romanNumeralExceptions.some(
      ex => upperName.includes(ex.toUpperCase())
    );

    // Remove hyphens BEFORE converting Roman numerals. In "HR-V" the hyphen creates a
    // word boundary, so \bV\b matched and the model came out as "HR-5" (same for FR-V,
    // CR-V, V-Class). Stripping the hyphen first leaves "HRV", where V is no longer a
    // separate word. Names without hyphens (Civic VIII, Golf VII) are unaffected.
    let result = modelName.replace(/([A-Za-z])-([A-Za-z])/g, '$1$2');

    if (!hasException) {
      result = result
        // Convert Roman numerals to Arabic (longest first to avoid partial matches)
        .replace(/\bXII\b/gi, '12')
        .replace(/\bXI\b/gi, '11')
        .replace(/\bIX\b/gi, '9')
        .replace(/\bX\b/gi, '10')    // Must be after XI, XII, IX
        .replace(/\bVIII\b/gi, '8')
        .replace(/\bVII\b/gi, '7')
        .replace(/\bVI\b/gi, '6')
        .replace(/\bIV\b/gi, '4')
        .replace(/\bV\b(?!\s*class)/gi, '5')     // Must be after IV, VII, VIII (exclude Mercedes V Class)
        .replace(/\bIII\b/gi, '3')
        .replace(/\bII\b/gi, '2')
        .replace(/\bI\b/gi, '1');     // Must be last
    }

    return result.trim();
  }

  // "Navigatie PilotOn Tip Tesla Opel Astra J 2009-2015 ..." -> "Opel Astra J 2009-2015 ..."
  // Navigatiile verticale de 9.7" au marcajul "Tip Tesla" intre prefix si marca; fara sa-l
  // scoatem, niciuna dintre ele nu incepe cu o marca si toate ies din sectiunea de marci.
  stripNamePrefix(productName) {
    return productName
      .replace(/^Navigatie\s+PilotOn\s+/i, '')
      .replace(/^Tip\s+Tesla\s+/i, '');
  }

  extractBrandModelFromName(productName) {
    let cleanName = this.stripNamePrefix(productName);

    // Find the brand
    let foundBrand = null;
    let brandPattern = null;
    
    for (const brand of this.carBrands) {
      const pattern = new RegExp(`^${brand}\\s+`, 'i');
      if (pattern.test(cleanName)) {
        foundBrand = brand;
        brandPattern = pattern;
        break;
      }
    }
    
    if (!foundBrand) {
      return null;
    }
    
    // Remove brand from the beginning
    cleanName = cleanName.replace(brandPattern, '');
    
    // Extract model and years - treat generations as part of model name
    // Pattern: MODEL GENERATION YEARS SPECS
    // Example: "CRV 1 2002-2006 2K 8GB 256GB 8 CORE" -> model: "CRV 2002-2006"
    // Example: "Duster 2 2012-2017 2K 4GB 64GB 8 CORE" -> model: "Duster 2012-2017"

    const yearPatterns = [
      /^(.+?)\s+(\d{4}-\d{4})\s+/,  // Model YYYY-YYYY
      /^(.+?)\s+(dupa\s+\d{4})\s+/, // Model dupa YYYY
      /^(.+?)\s+(pana\s+\d{4})\s+/, // Model pana YYYY
      /^(.+?)\s+(\d{4}-prezent)\s+/, // Model YYYY-prezent
      /^(.+?)\s+(\(\d{4}-\d{4}\))\s+/, // Model (YYYY-YYYY)
      /^(.+?)\s+(\d{4})\s+/,        // Model YYYY
    ];
    
    let model = null;
    let years = null;
    
    for (const pattern of yearPatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        model = match[1].trim();
        years = match[2].trim();
        break;
      }
    }
    
    // If no year pattern found, try to extract model without years
    if (!model) {
      // Look for common spec patterns to find where model ends
      const specPatterns = [
        /^(.+?)\s+\d+\s*inch\s+/i,
        /^(.+?)\s+\d+GB\s+/i,
        /^(.+?)\s+\d+K\s+/i,
        /^(.+?)\s+\d+\s+CORE\s*/i
      ];
      
      for (const pattern of specPatterns) {
        const match = cleanName.match(pattern);
        if (match) {
          model = match[1].trim();
          break;
        }
      }
    }
    
    // Clean up model name first
    if (model) {
      // Remove "dupa" from model names - it should only be in years
      model = model.replace(/\s*dupa\s*/gi, '').trim();
      // Remove head unit identifiers (CCC, CIC, NBT, EVO, etc.)
      model = this.removeHeadUnitIdentifiers(model);
    }
    
    // Create final model name without years - keep years separate
    let finalModel = model || 'Unknown';
    if (years) {
      // Only remove trailing single digits for models that are likely generation numbers
      // Keep model numbers for BMW Seria, Audi A-series, etc.
      // Only remove generation numbers for models like "CRV 1", "Duster 2"
      if (/^(CRV|Duster|Sandero|Logan|Outlander|Tucson|Sportage|Ceed|I10|I20|I30|Swift|Yaris|Corolla|Fiesta|Focus|Mondeo|Clio|Megane|308|5008|Octavia|Superb|Golf|Polo|Passat|Touran|Tiguan|Touareg)\s+\d+$/i.test(finalModel)) {
        finalModel = finalModel.replace(/\s+\d+\s*$/, '').trim();
      }
      // Create unique identifier by combining model and years for separate models
      finalModel = `${finalModel} ${years}`;
    }
    
    // Normalize VW to Volkswagen
    if (foundBrand && foundBrand.toUpperCase() === 'VW') {
      foundBrand = 'Volkswagen';
    }

    // Normalize Mercedes to Mercedes Benz
    if (foundBrand && foundBrand.toLowerCase() === 'mercedes') {
      foundBrand = 'Mercedes Benz';
    }
    
    return {
      brand: foundBrand,
      model: finalModel.replace(/\s+\d{4}.*$/, '').trim().replace(/\s*dupa\s*/gi, '').trim(), // Clean model name without years and "dupa"
      modelWithYears: finalModel, // Full identifier for database key
      years: years || null,
      generation: null // No more generations - treat each as separate model
    };
  }

  handleMercedesCClassW203(cleanName, productName) {
    // Handle Mercedes C Class W203 - split by generation years into separate models
    const yearPatterns = [
      /2000-2004/,
      /2004-2007/
    ];
    
    let foundYears = null;
    for (const pattern of yearPatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        foundYears = match[0];
        break;
      }
    }
    
    if (foundYears) {
      // Create distinct model names for each generation
      const model = `C Class W203 ${foundYears}`;
      return {
        brand: 'Mercedes Benz',
        model: model,
        years: foundYears,
        generation: null // No sub-generations for these separate models
      };
    }
    
    // Fallback to original logic if no specific years found
    return {
      brand: 'Mercedes Benz',
      model: 'C Class W203',
      years: null,
      generation: null
    };
  }

  extractGeneration(productName, years) {
    // Extract generation info from product name
    const generationPatterns = [
      /\b(I{1,3}|IV|V|VI|VII|VIII|IX|X)\b/i, // Roman numerals
      /\b(Mk\s*\d+|Mark\s*\d+)\b/i,         // Mk1, Mark 2, etc
      /\b(\d+(?:st|nd|rd|th)\s*gen)\b/i,     // 1st gen, 2nd gen
      /\b(facelift|pre-facelift|FL)\b/i      // Facelift indicators
    ];
    
    for (const pattern of generationPatterns) {
      const match = productName.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return years; // Use years as generation if no specific generation found
  }

  extractOriginalModelName(productName) {
    // Extract the original model name as it appears in folder structure
    let cleanName = this.stripNamePrefix(productName);

    // Find and remove the brand
    for (const brand of this.carBrands) {
      const pattern = new RegExp(`^${brand}\\s+`, 'i');
      if (pattern.test(cleanName)) {
        cleanName = cleanName.replace(pattern, '');
        break;
      }
    }
    
    // For generation-based models, extract the model name with generation number
    // Example: "CRV 1 2002-2006 2K 8GB" -> "CRV 1"
    // Example: "Duster 2 2014-2018 2K 4GB" -> "Duster 2"
    
    const yearPatterns = [
      /^(.+?)\s+(\d{4}-\d{4})\s+/,  // Model YYYY-YYYY
      /^(.+?)\s+(dupa\s+\d{4})\s+/, // Model dupa YYYY  
      /^(.+?)\s+(pana\s+\d{4})\s+/, // Model pana YYYY
      /^(.+?)\s+(\d{4}-prezent)\s+/, // Model YYYY-prezent
      /^(.+?)\s+(\(\d{4}-\d{4}\))\s+/, // Model (YYYY-YYYY)
      /^(.+?)\s+(\d{4})\s+/,        // Model YYYY
    ];
    
    for (const pattern of yearPatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        // Return the model name with generation number before the years, cleaned of head unit identifiers
        return this.removeHeadUnitIdentifiers(match[1].trim());
      }
    }

    // If no year pattern, try spec patterns
    const specPatterns = [
      /^(.+?)\s+\d+\s*inch\s+/i,
      /^(.+?)\s+\d+GB\s+/i,
      /^(.+?)\s+\d+K\s+/i,
      /^(.+?)\s+\d+\s+CORE\s*/i
    ];

    for (const pattern of specPatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        return this.removeHeadUnitIdentifiers(match[1].trim());
      }
    }

    return this.removeHeadUnitIdentifiers(cleanName.trim());
  }

  async getAllBrandsWithModels() {
    if (brandsCache.data && Date.now() - brandsCache.at < BRANDS_TTL_MS) {
      return brandsCache.data;
    }
    try {
      // Only get active products
      const products = await Product.find({ status: 'active' }, 'name').lean();
      const brandModelMap = new Map();
      
      for (const product of products) {
        const extracted = this.extractBrandModelFromName(product.name);
        if (extracted && extracted.brand && extracted.model) {
          // Normalize VW to Volkswagen and Mercedes to Mercedes Benz for consistency
          let normalizedBrand = extracted.brand;
          if (normalizedBrand.toUpperCase() === 'VW') {
            normalizedBrand = 'Volkswagen';
          }
          if (normalizedBrand.toLowerCase() === 'mercedes') {
            normalizedBrand = 'Mercedes Benz';
          }
          
          const brandKey = normalizedBrand.toLowerCase();
          
          if (!brandModelMap.has(brandKey)) {
            brandModelMap.set(brandKey, {
              brand: normalizedBrand,
              models: new Map()
            });
          }
          
          const brandData = brandModelMap.get(brandKey);
          // Create a unique key that includes years for separate models
          // Normalize the model name to avoid duplicates like "Civic VIII" vs "Civic 8"
          const cleanModel = extracted.model.replace(/\s*dupa\s*/gi, '').trim();
          const normalizedModel = this.normalizeModelName(cleanModel);
          const uniqueModelKey = `${normalizedModel.toLowerCase()} ${extracted.years || 'unknown'}`;

          if (!brandData.models.has(uniqueModelKey)) {
            brandData.models.set(uniqueModelKey, {
              model: normalizedModel, // Normalized model name (VIII -> 8, CR-V -> CRV)
              years: extracted.years, // Production years
              productCount: 0
            });
          }
          
          const modelData = brandData.models.get(uniqueModelKey);
          modelData.productCount++;
        }
      }
      
      // Convert to regular objects
      const result = {};
      for (const [brandKey, brandData] of brandModelMap) {
        result[brandKey] = {
          brand: brandData.brand,
          models: {}
        };
        
        for (const [modelKey, modelData] of brandData.models) {
          result[brandKey].models[modelKey] = {
            model: modelData.model,
            years: modelData.years,
            imageFolderName: modelData.imageFolderName,
            productCount: modelData.productCount
          };
        }
      }
      
      brandsCache = { data: result, at: Date.now() };
      return result;
    } catch (error) {
      console.error('Error extracting brands and models:', error);
      throw error;
    }
  }

  async getProductsByBrandModel(brand, model, generation = null) {
    try {
      // Handle VW/Volkswagen and Mercedes/Mercedes Benz aliases
      const brandVariants = [];
      if (brand.toLowerCase() === 'volkswagen') {
        brandVariants.push('Volkswagen', 'VW');
      } else if (brand.toUpperCase() === 'VW') {
        brandVariants.push('Volkswagen', 'VW');
      } else if (brand.toLowerCase() === 'mercedes benz' || brand.toLowerCase() === 'mercedes') {
        brandVariants.push('Mercedes Benz', 'Mercedes');
      } else {
        brandVariants.push(brand);
      }
      
      // Create search patterns for all brand variants
      // "Tip Tesla" e optional: navigatiile de 9.7" au marcajul intre prefix si marca
      const brandPatterns = brandVariants.map(variant =>
        new RegExp(`Navigatie\\s+PilotOn\\s+(?:Tip\\s+Tesla\\s+)?${variant}`, 'i')
      );
      
      let query = {
        name: { $in: brandPatterns.map(pattern => ({ $regex: pattern })) }
      };
      
      // If multiple patterns, use $or
      if (brandPatterns.length > 1) {
        query = {
          $or: brandPatterns.map(pattern => ({ name: { $regex: pattern } }))
        };
      } else {
        query = { name: { $regex: brandPatterns[0] } };
      }
      
      // Get all products matching brand variants (only active).
      // Filtrarea de mai jos are nevoie doar de nume; citirea documentelor intregi
      // insemna ~950 de produse x ~25 KB la VW si ducea ruta in timeout la 120s.
      query.status = 'active';
      let products = await Product.find(query).select('name').lean();
      
      // Filter by model - use simple base model matching 
      products = products.filter(product => {
        const extracted = this.extractBrandModelFromName(product.name);
        if (!extracted) return false;
        
        // Normalize brand for comparison (VW -> Volkswagen, Mercedes -> Mercedes Benz)
        let normalizedExtractedBrand = extracted.brand;
        if (normalizedExtractedBrand.toUpperCase() === 'VW') {
          normalizedExtractedBrand = 'Volkswagen';
        }
        if (normalizedExtractedBrand.toLowerCase() === 'mercedes') {
          normalizedExtractedBrand = 'Mercedes Benz';
        }

        let normalizedSearchBrand = brand;
        if (normalizedSearchBrand.toUpperCase() === 'VW') {
          normalizedSearchBrand = 'Volkswagen';
        }
        if (normalizedSearchBrand.toLowerCase() === 'mercedes') {
          normalizedSearchBrand = 'Mercedes Benz';
        }
        
        // Check if brands match
        if (normalizedExtractedBrand.toLowerCase() !== normalizedSearchBrand.toLowerCase()) {
          return false;
        }
        
        // Recreate the same normalized modelKey that was generated in getAllBrandsWithModels
        const cleanModel = extracted.model.replace(/\s*dupa\s*/gi, '').trim();
        const normalizedModel = this.normalizeModelName(cleanModel);
        const productModelKey = `${normalizedModel.toLowerCase()} ${extracted.years || 'unknown'}`;

        // Normalize the search model too
        const normalizedSearchModel = this.normalizeModelName(model).toLowerCase().trim();

        // Check exact match first
        if (productModelKey === normalizedSearchModel) {
          return true;
        }

        // Check if the search model is a prefix of the product model key
        // This handles cases like "civic 8" matching "civic 8 2006-2011"
        if (productModelKey.startsWith(normalizedSearchModel + ' ')) {
          return true;
        }

        // Also check if the extracted base model (without years) matches the search
        if (normalizedModel.toLowerCase() === normalizedSearchModel) {
          return true;
        }

        return false;
      });
      
      // Abia acum, pe cele cateva produse ramase, se citesc campurile de care are
      // nevoie cardul din grila.
      // Aceeasi proiectie ca listarea: cardul are nevoie de o poza si de cate sunt,
      // nu de toate cele ~28 de URL-uri (erau 90% din raspunsul rutei).
      const ids = products.map(p => p._id);
      return Product.aggregate([
        { $match: { _id: { $in: ids } } },
        { $project: {
          name: 1, slug: 1, price: 1, originalPrice: 1, discount: 1, stock: 1, brand: 1,
          category: 1, subcategory: 1, featured: 1, newProduct: 1, onSale: 1, status: 1,
          sku: 1, averageRating: 1, totalReviews: 1, shortDescription: 1,
          imageCount: { $size: { $ifNull: ['$images', []] } },
          images: { $slice: [{ $ifNull: ['$images', []] }, 1] },
          'romanianSpecs.features.functii': 1,
          'structuredDescription.sections': {
            $slice: [{ $ifNull: ['$structuredDescription.sections', []] }, 1]
          }
        } }
      ]);
    } catch (error) {
      console.error('Error getting products by brand/model:', error);
      throw error;
    }
  }
}

module.exports = BrandModelExtractor;