const Product = require('../models/Product');

class BrandModelExtractor {
  constructor() {
    // Common car brands to look for in product names
    this.carBrands = [
      'Alfa Romeo', 'Audi', 'BMW', 'Mercedes', 'Volkswagen', 'VW', 'Toyota', 
      'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
      'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo',
      'Skoda', 'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Land Rover',
      'Jaguar', 'Porsche', 'Mini', 'Smart', 'Suzuki', 'Isuzu', 'Infiniti',
      'Lexus', 'Acura', 'Genesis', 'DS', 'Cupra'
    ];
  }

  extractBrandModelFromName(productName) {
    // Remove "Navigatie PilotOn" prefix
    let cleanName = productName.replace(/^Navigatie\s+PilotOn\s+/i, '');
    
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
        brand: 'Mercedes',
        model: model,
        years: foundYears,
        generation: null // No sub-generations for these separate models
      };
    }
    
    // Fallback to original logic if no specific years found
    return {
      brand: 'Mercedes',
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
    // Remove "Navigatie PilotOn" prefix
    let cleanName = productName.replace(/^Navigatie\s+PilotOn\s+/i, '');
    
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
        return match[1].trim(); // Return the model name with generation number before the years
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
        return match[1].trim();
      }
    }
    
    return cleanName.trim();
  }

  async getAllBrandsWithModels() {
    try {
      const products = await Product.find({}, 'name').lean();
      const brandModelMap = new Map();
      
      for (const product of products) {
        const extracted = this.extractBrandModelFromName(product.name);
        if (extracted && extracted.brand && extracted.model) {
          // Normalize VW to Volkswagen for consistency
          let normalizedBrand = extracted.brand;
          if (normalizedBrand.toUpperCase() === 'VW') {
            normalizedBrand = 'Volkswagen';
          }
          
          const brandKey = normalizedBrand.toLowerCase();
          
          if (!brandModelMap.has(brandKey)) {
            brandModelMap.set(brandKey, {
              brand: normalizedBrand,
              models: new Map()
            });
          }
          
          const brandData = brandModelMap.get(brandKey);
          // Create a unique key that includes years for separate models, removing "dupa" from key
          const cleanModelForKey = extracted.model.replace(/\s*dupa\s*/gi, '').trim();
          const uniqueModelKey = `${cleanModelForKey.toLowerCase()} ${extracted.years || 'unknown'}`;
          
          if (!brandData.models.has(uniqueModelKey)) {
            const cleanModel = extracted.model.replace(/\s*dupa\s*/gi, '').trim();
            brandData.models.set(uniqueModelKey, {
              model: cleanModel, // Clean model name without "dupa"
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
      
      return result;
    } catch (error) {
      console.error('Error extracting brands and models:', error);
      throw error;
    }
  }

  async getProductsByBrandModel(brand, model, generation = null) {
    try {
      // Handle VW/Volkswagen aliases
      const brandVariants = [];
      if (brand.toLowerCase() === 'volkswagen') {
        brandVariants.push('Volkswagen', 'VW');
      } else if (brand.toUpperCase() === 'VW') {
        brandVariants.push('Volkswagen', 'VW');
      } else {
        brandVariants.push(brand);
      }
      
      // Create search patterns for all brand variants
      const brandPatterns = brandVariants.map(variant => 
        new RegExp(`Navigatie\\s+PilotOn\\s+${variant}`, 'i')
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
      
      // Get all products matching brand variants
      let products = await Product.find(query).lean();
      
      // Filter by model - use simple base model matching 
      products = products.filter(product => {
        const extracted = this.extractBrandModelFromName(product.name);
        if (!extracted) return false;
        
        // Normalize brand for comparison (VW -> Volkswagen)
        let normalizedExtractedBrand = extracted.brand;
        if (normalizedExtractedBrand.toUpperCase() === 'VW') {
          normalizedExtractedBrand = 'Volkswagen';
        }
        
        let normalizedSearchBrand = brand;
        if (normalizedSearchBrand.toUpperCase() === 'VW') {
          normalizedSearchBrand = 'Volkswagen';
        }
        
        // Check if brands match
        if (normalizedExtractedBrand.toLowerCase() !== normalizedSearchBrand.toLowerCase()) {
          return false;
        }
        
        // Simple approach: recreate the same modelKey that was generated in getAllBrandsWithModels
        // and compare with the search model
        const cleanModelForKey = extracted.model.replace(/\s*dupa\s*/gi, '').trim();
        const productModelKey = `${cleanModelForKey.toLowerCase()} ${extracted.years || 'unknown'}`;

        // Handle both exact match and partial match for base model names
        // Example: search "seria 3" should match "seria 3 2004-2013" and "seria 3 1999-2006"
        const searchModel = model.toLowerCase().trim();

        // Check exact match first
        if (productModelKey === searchModel) {
          return true;
        }

        // Check if the search model is a prefix of the product model key
        // This handles cases like "seria 3" matching "seria 3 2004-2013"
        if (productModelKey.startsWith(searchModel + ' ')) {
          return true;
        }

        // Also check if the extracted base model (without years) matches the search
        if (cleanModelForKey.toLowerCase() === searchModel) {
          return true;
        }

        return false;
      });
      
      return products;
    } catch (error) {
      console.error('Error getting products by brand/model:', error);
      throw error;
    }
  }
}

module.exports = BrandModelExtractor;