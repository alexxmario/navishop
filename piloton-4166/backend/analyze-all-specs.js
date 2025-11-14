const FeedParser = require('./services/feedParser');
const mongoose = require('mongoose');

async function analyzeAllSpecifications() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/piloton');

    console.log('Analyzing specifications from XML feed...');
    const feedParser = new FeedParser();

    // Fetch and parse feed
    const xmlData = await feedParser.fetchFeed();
    const feedData = await feedParser.parseFeed(xmlData);

    const entries = feedData.feed.entry || [];
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    console.log(`Found ${entriesArray.length} products in feed`);

    // Analyze first 10 products to understand specification patterns
    const sampleSize = Math.min(10, entriesArray.length);
    const allSpecifications = new Set();
    const specificationsByCategory = {
      general: new Set(),
      hardware: new Set(),
      display: new Set(),
      connectivity: new Set(),
      features: new Set(),
      compatibility: new Set(),
      package: new Set()
    };

    console.log(`\nAnalyzing first ${sampleSize} products for specification patterns...\n`);

    for (let i = 0; i < sampleSize; i++) {
      const entry = entriesArray[i];
      const title = entry['g:title'];
      const link = entry['g:link'];
      const mpn = entry['g:mpn'];

      console.log(`--- Product ${i + 1}: ${title} ---`);
      console.log(`Link: ${link}`);
      console.log(`MPN: ${mpn}`);

      try {
        const romanianSpecs = await feedParser.extractRealSpecifications(link);

        if (romanianSpecs) {
          console.log('Extracted specifications:');

          // Analyze general specs
          if (romanianSpecs.general) {
            Object.keys(romanianSpecs.general).forEach(key => {
              allSpecifications.add(`general.${key}`);
              specificationsByCategory.general.add(key);
              console.log(`  General - ${key}: ${String(romanianSpecs.general[key]).substring(0, 80)}...`);
            });
          }

          // Analyze hardware specs
          if (romanianSpecs.hardware) {
            Object.keys(romanianSpecs.hardware).forEach(key => {
              allSpecifications.add(`hardware.${key}`);
              specificationsByCategory.hardware.add(key);
              console.log(`  Hardware - ${key}: ${String(romanianSpecs.hardware[key]).substring(0, 80)}...`);
            });
          }

          // Analyze display specs
          if (romanianSpecs.display) {
            Object.keys(romanianSpecs.display).forEach(key => {
              allSpecifications.add(`display.${key}`);
              specificationsByCategory.display.add(key);
              console.log(`  Display - ${key}: ${String(romanianSpecs.display[key]).substring(0, 80)}...`);
            });
          }

          // Analyze connectivity specs
          if (romanianSpecs.connectivity) {
            Object.keys(romanianSpecs.connectivity).forEach(key => {
              allSpecifications.add(`connectivity.${key}`);
              specificationsByCategory.connectivity.add(key);
              console.log(`  Connectivity - ${key}: ${String(romanianSpecs.connectivity[key]).substring(0, 80)}...`);
            });
          }

          // Analyze features
          if (romanianSpecs.features) {
            Object.keys(romanianSpecs.features).forEach(key => {
              allSpecifications.add(`features.${key}`);
              specificationsByCategory.features.add(key);
              console.log(`  Features - ${key}: ${String(romanianSpecs.features[key]).substring(0, 80)}...`);
            });
          }

          // Analyze compatibility
          if (romanianSpecs.compatibility) {
            Object.keys(romanianSpecs.compatibility).forEach(key => {
              allSpecifications.add(`compatibility.${key}`);
              specificationsByCategory.compatibility.add(key);
              console.log(`  Compatibility - ${key}: ${String(romanianSpecs.compatibility[key]).substring(0, 80)}...`);
            });
          }

          // Analyze package contents
          if (romanianSpecs.package) {
            Object.keys(romanianSpecs.package).forEach(key => {
              allSpecifications.add(`package.${key}`);
              specificationsByCategory.package.add(key);
              console.log(`  Package - ${key}: ${String(romanianSpecs.package[key]).substring(0, 80)}...`);
            });
          }
        } else {
          console.log('  No specifications extracted');
        }

        console.log(''); // Blank line between products
      } catch (error) {
        console.error(`  Error extracting specs: ${error.message}`);
      }
    }

    // Summary of all found specifications
    console.log('\n=== COMPREHENSIVE SPECIFICATION ANALYSIS ===\n');
    console.log(`Total unique specifications found: ${allSpecifications.size}\n`);

    console.log('GENERAL SPECIFICATIONS:');
    Array.from(specificationsByCategory.general).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    console.log('\nHARDWARE SPECIFICATIONS:');
    Array.from(specificationsByCategory.hardware).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    console.log('\nDISPLAY SPECIFICATIONS:');
    Array.from(specificationsByCategory.display).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    console.log('\nCONNECTIVITY SPECIFICATIONS:');
    Array.from(specificationsByCategory.connectivity).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    console.log('\nFEATURE SPECIFICATIONS:');
    Array.from(specificationsByCategory.features).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    console.log('\nCOMPATIBILITY SPECIFICATIONS:');
    Array.from(specificationsByCategory.compatibility).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    console.log('\nPACKAGE SPECIFICATIONS:');
    Array.from(specificationsByCategory.package).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    console.log('\n=== ALL SPECIFICATIONS (CATEGORY.FIELD) ===');
    Array.from(allSpecifications).sort().forEach(spec => {
      console.log(`  - ${spec}`);
    });

    process.exit(0);

  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

analyzeAllSpecifications();