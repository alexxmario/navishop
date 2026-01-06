require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Configuration
const RATE_LIMIT_MS = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;

// Utility: Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility: HTTP request with retry logic
async function retryRequest(url, maxRetries = MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PilotOnBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8'
        }
      });
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`⚠️  Request failed, retrying... (${i + 1}/${maxRetries})`);
      await sleep(2000 * (i + 1)); // Exponential backoff
    }
  }
}

// Extract JSON-LD structured data from page
function extractJsonLd(html) {
  const $ = cheerio.load(html);
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const structuredData = [];

  jsonLdScripts.each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      structuredData.push(data);
    } catch (error) {
      // Skip invalid JSON
    }
  });

  return structuredData;
}

// Search PilotOn for product by name/model
async function searchPilotonProduct(productName) {
  console.log(`  🔍 Searching PilotOn for: ${productName}`);

  try {
    // Try to construct likely product URL from name
    // PilotOn URLs are typically: http://www.piloton.ro/gps-[model]-[size].html
    const cleanName = productName
      .toLowerCase()
      .replace(/navigatie|navigație|gps|piloton/gi, '')
      .trim()
      .replace(/\s+/g, '-');

    // Try common URL patterns
    const possibleUrls = [
      `http://www.piloton.ro/gps-${cleanName}.html`,
      `http://www.piloton.ro/navigatie-${cleanName}.html`,
      `http://www.piloton.ro/${cleanName}.html`
    ];

    for (const url of possibleUrls) {
      try {
        const response = await axios.head(url, { timeout: 5000, maxRedirects: 5 });
        if (response.status === 200) {
          console.log(`  ✓ Found URL: ${url}`);
          return url;
        }
      } catch (error) {
        // URL doesn't exist, try next one
      }
    }

    // If direct URL doesn't work, try searching the category pages
    console.log(`  ⚠️  Direct URL not found, searching category pages...`);

    const categoryUrls = [
      'http://www.piloton.ro/gps-5-inch',
      'http://www.piloton.ro/gps-7-inch',
      'http://www.piloton.ro/gps-9-inch',
      'http://www.piloton.ro/navigatii-auto-android'
    ];

    for (const categoryUrl of categoryUrls) {
      try {
        const response = await retryRequest(categoryUrl);
        const $ = cheerio.load(response.data);

        // Find all product links
        const productLinks = [];
        $('a[href*=".html"]').each((i, el) => {
          const href = $(el).attr('href');
          const linkText = $(el).text().trim();

          if (href && linkText) {
            const fullUrl = href.startsWith('http') ? href : `http://www.piloton.ro${href}`;

            // Check if link text matches product name (fuzzy match)
            const similarity = calculateSimilarity(productName.toLowerCase(), linkText.toLowerCase());
            if (similarity > 0.5) {
              productLinks.push({ url: fullUrl, similarity, text: linkText });
            }
          }
        });

        // Sort by similarity and return best match
        if (productLinks.length > 0) {
          productLinks.sort((a, b) => b.similarity - a.similarity);
          console.log(`  ✓ Found match: ${productLinks[0].text} (${Math.round(productLinks[0].similarity * 100)}% match)`);
          return productLinks[0].url;
        }

        await sleep(1000); // Rate limit between category searches
      } catch (error) {
        console.log(`  ⚠️  Failed to search ${categoryUrl}: ${error.message}`);
      }
    }

    console.log(`  ✗ Product not found on PilotOn`);
    return null;
  } catch (error) {
    console.error(`  ✗ Search error: ${error.message}`);
    return null;
  }
}

// Simple string similarity calculation
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// Scrape description from product page
async function scrapeProductDescription(productUrl) {
  console.log(`  📄 Fetching description from: ${productUrl}`);

  try {
    const response = await retryRequest(productUrl);
    const html = response.data;
    const $ = cheerio.load(html);
    const jsonLdData = extractJsonLd(html);

    // Find Product schema from JSON-LD
    const productSchema = jsonLdData.find(item => item['@type'] === 'Product');

    // Extract description from multiple sources
    let description = '';
    let specifications = [];

    // Try JSON-LD first
    if (productSchema?.description) {
      description = productSchema.description;
    }

    // Fallback to HTML selectors
    if (!description) {
      const descSelectors = [
        '.product-description',
        '.description',
        '[itemprop="description"]',
        '.product-details',
        '#description'
      ];

      for (const selector of descSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          description = element.html();
          break;
        }
      }
    }

    // Extract specifications from table
    $('table tr, .specifications tr, .specs-table tr, .product-specs tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim();
        const value = $(cells[1]).text().trim();
        if (key && value) {
          specifications.push({ key, value });
        }
      }
    });

    // Also check for dl/dt/dd structure
    $('.specifications dl, .specs dl, .product-specs dl').each((i, dl) => {
      $(dl).find('dt').each((j, dt) => {
        const key = $(dt).text().trim();
        const dd = $(dt).next('dd');
        if (dd.length > 0) {
          const value = dd.text().trim();
          if (key && value) {
            specifications.push({ key, value });
          }
        }
      });
    });

    console.log(`  ✓ Extracted description (${description.length} chars) and ${specifications.length} specifications`);

    return {
      description,
      specifications
    };
  } catch (error) {
    console.error(`  ✗ Failed to scrape description: ${error.message}`);
    return null;
  }
}

// Parse description into structured format
function parseStructuredDescription(description) {
  if (!description) return null;

  const $ = cheerio.load(description);
  const sections = [];

  // Common section patterns with icons
  const sectionPatterns = [
    { title: 'Caracteristici principale', icon: '⭐', keywords: ['caracteristici', 'features', 'specificații'] },
    { title: 'Display', icon: '📺', keywords: ['display', 'ecran', 'rezoluție'] },
    { title: 'Performanță', icon: '⚡', keywords: ['performanță', 'procesor', 'ram', 'memorie'] },
    { title: 'Conectivitate', icon: '🔗', keywords: ['conectivitate', 'bluetooth', 'wifi', 'usb'] },
    { title: 'Funcționalități', icon: '🎯', keywords: ['funcții', 'aplicații', 'navigație', 'gps'] },
    { title: 'Conținut pachet', icon: '📦', keywords: ['pachet', 'conținut', 'include', 'include'] }
  ];

  // Extract bullet points and organize them into sections
  const allBullets = [];

  // Find all list items
  $('li').each((i, li) => {
    const text = $(li).text().trim();
    if (text) {
      allBullets.push(text);
    }
  });

  // If no list items, try to split by line breaks
  if (allBullets.length === 0) {
    const plainText = $.text();
    const lines = plainText.split(/\n|<br>/).filter(line => line.trim());
    allBullets.push(...lines);
  }

  // Group bullets by section
  let currentSection = { title: 'Despre produs', icon: 'ℹ️', points: [] };
  sections.push(currentSection);

  allBullets.forEach(bullet => {
    const lowerBullet = bullet.toLowerCase();

    // Check if this bullet indicates a new section
    let matchedSection = null;
    for (const pattern of sectionPatterns) {
      if (pattern.keywords.some(keyword => lowerBullet.includes(keyword))) {
        matchedSection = pattern;
        break;
      }
    }

    if (matchedSection && currentSection.points.length > 0) {
      // Start new section
      currentSection = { title: matchedSection.title, icon: matchedSection.icon, points: [bullet] };
      sections.push(currentSection);
    } else {
      // Add to current section
      currentSection.points.push(bullet);
    }
  });

  // Remove empty sections
  const filteredSections = sections.filter(s => s.points.length > 0);

  return {
    sections: filteredSections,
    originalDescription: description,
    parsedAt: new Date()
  };
}

// Parse specifications into Romanian specs structure
function parseRomanianSpecs(specifications) {
  const romanianSpecs = {
    general: {},
    hardware: {},
    display: {},
    connectivity: {},
    features: {},
    package: {},
    compatibility: {},
    additional: {},
    scrapedAt: new Date()
  };

  specifications.forEach(spec => {
    const key = spec.key.toLowerCase();
    const value = spec.value;

    // Hardware specs
    if (key.includes('procesor') || key.includes('processor')) {
      romanianSpecs.hardware.modelProcesor = value;
    } else if (key.includes('ram') || key.includes('memorie ram')) {
      romanianSpecs.hardware.memorieRAM = value;
    } else if (key.includes('stocare') || key.includes('memorie interna') || key.includes('storage')) {
      romanianSpecs.hardware.capacitateStocare = value;
    }

    // Display specs
    else if (key.includes('diagonala') || key.includes('dimensiune ecran')) {
      romanianSpecs.display.diagonalaDisplay = value;
    } else if (key.includes('rezolutie') || key.includes('resolution')) {
      romanianSpecs.display.rezolutieDisplay = value;
    } else if (key.includes('tehnologie display') || key.includes('tip ecran')) {
      romanianSpecs.display.tehnologieDisplay = value;
    }

    // Connectivity
    else if (key.includes('bluetooth')) {
      romanianSpecs.connectivity.bluetooth = value;
    } else if (key.includes('wifi') || key.includes('wi-fi')) {
      romanianSpecs.connectivity.wifi = value;
    } else if (key.includes('conectivitate') && !key.includes('bluetooth') && !key.includes('wifi')) {
      romanianSpecs.connectivity.conectivitate = value;
    }

    // Features
    else if (key.includes('functii') || key.includes('funcționalități')) {
      romanianSpecs.features.functii = value;
    } else if (key.includes('split screen') || key.includes('ecran împărțit')) {
      romanianSpecs.features.splitScreen = value;
    } else if (key.includes('aplicatii') || key.includes('aplicații')) {
      romanianSpecs.features.suportAplicatiiAndroid = value;
    } else if (key.includes('limbi') || key.includes('limba')) {
      romanianSpecs.features.limbiInterfata = value;
    } else if (key.includes('comenzi volan') || key.includes('butoane volan')) {
      romanianSpecs.features.preluareComenziVolan = value;
    }

    // Package
    else if (key.includes('continut pachet') || key.includes('conținut pachet') || key.includes('in cutie')) {
      romanianSpecs.package.continutPachet = value;
    } else if (key.includes('formate') || key.includes('media support')) {
      romanianSpecs.package.formateMediaSuportate = value;
    }

    // Compatibility
    else if (key.includes('destinat') || key.includes('compatibil')) {
      romanianSpecs.compatibility.destinatPentru = value;
    } else if (key.includes('marca') || key.includes('brand')) {
      romanianSpecs.compatibility.marca = value;
    } else if (key.includes('montare') || key.includes('montaj')) {
      romanianSpecs.compatibility.tipMontare = value;
    }

    // General
    else if (key.includes('sistem operare') || key.includes('os')) {
      romanianSpecs.general.sistemOperare = value;
    } else if (key.includes('harta') || key.includes('hartă') || key.includes('maps')) {
      romanianSpecs.general.harta = value;
    } else if (key.includes('tmc') || key.includes('traffic')) {
      romanianSpecs.general.tmc = value;
    } else if (key.includes('categorie') || key.includes('categorii')) {
      romanianSpecs.general.categorii = value;
    }

    // Additional
    else if (key.includes('garantie') || key.includes('garanție')) {
      romanianSpecs.additional.garantie = value;
    } else if (key.includes('observat') || key.includes('notă')) {
      romanianSpecs.additional.observatii = value;
    } else if (key.includes('limitare') || key.includes('restricț')) {
      romanianSpecs.additional.limitari = value;
    }
  });

  return romanianSpecs;
}

// Parse specs for detailedSpecs and displaySpecs
function parseDetailedSpecs(specifications) {
  const detailedSpecs = {};
  const displaySpecs = {};

  specifications.forEach(spec => {
    const key = spec.key.toLowerCase();
    const value = spec.value;

    // Processor, RAM, Storage
    if (key.includes('procesor') || key.includes('processor')) {
      detailedSpecs.processor = value;
    } else if (key.includes('ram')) {
      detailedSpecs.ram = value;
    } else if (key.includes('stocare') || key.includes('storage')) {
      detailedSpecs.storage = value;
    }

    // Display specs
    else if (key.includes('diagonala') || key.includes('dimensiune')) {
      displaySpecs.screenSize = value;
    } else if (key.includes('rezolutie')) {
      displaySpecs.resolution = value;
    } else if (key.includes('tehnologie')) {
      // Map to enum values
      const tech = value.toUpperCase();
      if (['INCELL', 'QLED', 'LCD', 'OLED'].includes(tech)) {
        displaySpecs.technology = tech;
      } else {
        displaySpecs.technology = value;
      }
    }
  });

  return { detailedSpecs, displaySpecs };
}

// Update product with description
async function updateProductDescription(product, descriptionData) {
  try {
    const updates = {};

    // Update description if not empty
    if (descriptionData.description && descriptionData.description.trim()) {
      updates.description = descriptionData.description;

      // Parse structured description
      const structuredDesc = parseStructuredDescription(descriptionData.description);
      if (structuredDesc && structuredDesc.sections.length > 0) {
        updates.structuredDescription = structuredDesc;
      }

      // Also update shortDescription if it's empty or generic
      if (!product.shortDescription || product.shortDescription === product.name) {
        const plainText = descriptionData.description.replace(/<[^>]*>/g, '').substring(0, 200);
        updates.shortDescription = plainText;
      }
    }

    // Update specifications if we got any
    if (descriptionData.specifications && descriptionData.specifications.length > 0) {
      // Merge with existing specifications (don't overwrite)
      const existingKeys = new Set(product.specifications.map(s => s.key));
      const newSpecs = descriptionData.specifications.filter(s => !existingKeys.has(s.key));

      if (newSpecs.length > 0) {
        updates.specifications = [...product.specifications, ...newSpecs];
      }

      // Parse specs into structured formats
      const romanianSpecs = parseRomanianSpecs(descriptionData.specifications);
      updates.romanianSpecs = romanianSpecs;

      const { detailedSpecs, displaySpecs } = parseDetailedSpecs(descriptionData.specifications);
      if (Object.keys(detailedSpecs).length > 0) {
        updates.detailedSpecs = detailedSpecs;
      }
      if (Object.keys(displaySpecs).length > 0) {
        updates.displaySpecs = displaySpecs;
      }
    }

    // Only update if we have changes
    if (Object.keys(updates).length > 0) {
      await Product.findByIdAndUpdate(product._id, updates);
      console.log(`  ✅ Updated ${product.name}`);
      console.log(`     - Description: ${updates.description ? 'Yes' : 'No'}`);
      console.log(`     - Structured sections: ${updates.structuredDescription?.sections?.length || 0}`);
      console.log(`     - Specifications: ${updates.specifications?.length || 0}`);
      return true;
    } else {
      console.log(`  ⚠️  No updates needed for ${product.name}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Failed to update ${product.name}: ${error.message}`);
    return false;
  }
}

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting GPS product description updater...\n');
  console.log('='.repeat(60));

  try {
    // Connect to database
    await connectDB();

    // Find all GPS products that need detailed descriptions
    // Include products with short descriptions or missing structured data
    const gpsProducts = await Product.find({
      category: 'gps',
      $or: [
        { description: { $exists: false } },
        { description: '' },
        { description: null },
        { structuredDescription: { $exists: false } },
        { 'structuredDescription.sections': { $size: 0 } },
        { specifications: { $size: 0 } },
        { specifications: { $exists: false } }
      ]
    });

    console.log(`📋 Found ${gpsProducts.length} GPS products needing descriptions\n`);
    console.log('='.repeat(60));

    if (gpsProducts.length === 0) {
      console.log('✅ All GPS products already have descriptions!');
      await mongoose.connection.close();
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Process each product
    for (let i = 0; i < gpsProducts.length; i++) {
      const product = gpsProducts[i];
      console.log(`\n[${i + 1}/${gpsProducts.length}] Processing: ${product.name}`);
      console.log(`  SKU: ${product.sku}`);

      try {
        // Search for product on PilotOn
        const productUrl = await searchPilotonProduct(product.name);

        if (!productUrl) {
          console.log(`  ⚠️  Could not find product on PilotOn, skipping...`);
          failCount++;
          continue;
        }

        // Scrape description
        const descriptionData = await scrapeProductDescription(productUrl);

        if (!descriptionData) {
          console.log(`  ⚠️  Could not extract description, skipping...`);
          failCount++;
          continue;
        }

        // Update product in database
        const updated = await updateProductDescription(product, descriptionData);

        if (updated) {
          successCount++;
        }

        // Rate limit between products
        if (i < gpsProducts.length - 1) {
          console.log(`  ⏳ Waiting ${RATE_LIMIT_MS}ms before next request...`);
          await sleep(RATE_LIMIT_MS);
        }

      } catch (error) {
        console.error(`  ❌ Error processing ${product.name}: ${error.message}`);
        failCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Update Summary:');
    console.log(`  ✅ Successfully updated: ${successCount} products`);
    console.log(`  ❌ Failed: ${failCount} products`);
    console.log(`  📋 Total processed: ${gpsProducts.length} products`);
    console.log('='.repeat(60));

    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('🏁 Update completed!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { updateProductDescription, scrapeProductDescription, searchPilotonProduct };
