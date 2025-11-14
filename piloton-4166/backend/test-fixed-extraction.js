const FeedParser = require('./services/feedParser');

async function testFixedExtraction() {
  try {
    console.log('Testing FIXED specification extraction...');
    console.log('========================================\n');

    const feedParser = new FeedParser();

    // Test the specific BMW product you mentioned
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-9-inch-2gb-32gb-4-core-7450';

    console.log('Extracting from:', testUrl);
    const romanianSpecs = await feedParser.extractRealSpecifications(testUrl);

    if (romanianSpecs) {
      console.log('\n✅ SUCCESS! Clean specifications extracted:\n');

      console.log('=== GENERAL ===');
      Object.keys(romanianSpecs.general).forEach(key => {
        if (romanianSpecs.general[key]) {
          console.log(`${key}: ${romanianSpecs.general[key]}`);
        }
      });

      console.log('\n=== HARDWARE ===');
      Object.keys(romanianSpecs.hardware).forEach(key => {
        if (romanianSpecs.hardware[key]) {
          console.log(`${key}: ${romanianSpecs.hardware[key]}`);
        }
      });

      console.log('\n=== DISPLAY ===');
      Object.keys(romanianSpecs.display).forEach(key => {
        if (romanianSpecs.display[key]) {
          console.log(`${key}: ${romanianSpecs.display[key]}`);
        }
      });

      console.log('\n=== CONNECTIVITY ===');
      Object.keys(romanianSpecs.connectivity).forEach(key => {
        if (romanianSpecs.connectivity[key]) {
          console.log(`${key}: ${romanianSpecs.connectivity[key]}`);
        }
      });

      console.log('\n=== FEATURES ===');
      Object.keys(romanianSpecs.features).forEach(key => {
        if (romanianSpecs.features[key]) {
          console.log(`${key}: ${romanianSpecs.features[key]}`);
        }
      });

      console.log('\n=== COMPATIBILITY ===');
      Object.keys(romanianSpecs.compatibility).forEach(key => {
        if (romanianSpecs.compatibility[key]) {
          console.log(`${key}: ${romanianSpecs.compatibility[key]}`);
        }
      });

      console.log('\n=== PACKAGE ===');
      Object.keys(romanianSpecs.package).forEach(key => {
        if (romanianSpecs.package[key]) {
          console.log(`${key}: ${romanianSpecs.package[key]}`);
        }
      });

      // Verify the specific fields you mentioned
      console.log('\n=== VERIFICATION OF YOUR REQUIREMENTS ===');
      console.log(`✅ SKU: ${romanianSpecs.general?.sku || 'NOT FOUND'}`);
      console.log(`✅ Memorie RAM: ${romanianSpecs.hardware?.memorieRAM || 'NOT FOUND'}`);
      console.log(`✅ Capacitate Stocare: ${romanianSpecs.hardware?.capacitateStocare || 'NOT FOUND'}`);
      console.log(`✅ Diagonala Display: ${romanianSpecs.display?.diagonalaDisplay || 'NOT FOUND'}`);
      console.log(`✅ Conectivitate: ${romanianSpecs.connectivity?.conectivitate || romanianSpecs.connectivity?.bluetooth || 'NOT FOUND'}`);
      console.log(`✅ Brand: ${romanianSpecs.general?.brand || 'NOT FOUND'}`);

      console.log('\n=== RAW CONNECTIVITY FIELDS ===');
      console.log('conectivitate field:', romanianSpecs.connectivity?.conectivitate);
      console.log('bluetooth field:', romanianSpecs.connectivity?.bluetooth);

    } else {
      console.log('❌ FAILED to extract specifications');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFixedExtraction();