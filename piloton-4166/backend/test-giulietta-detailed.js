const FeedParser = require('./services/feedParser');

async function testGiuliettaDetailed() {
  try {
    console.log('Testing ALFA ROMEO GIULIETTA 2014-2020 2K 8GB 256GB 8 CORE');
    console.log('===============================================================\n');

    const feedParser = new FeedParser();

    // Test the specific Giulietta product you mentioned
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-alfa-romeo-giulietta-2014-2020-2k-8gb-256gb-8-core-7419';

    console.log('Extracting from:', testUrl);
    const romanianSpecs = await feedParser.extractRealSpecifications(testUrl);

    if (romanianSpecs) {
      console.log('\n✅ SUCCESS! Clean specifications extracted:\n');

      console.log('=== GENERAL ===');
      Object.keys(romanianSpecs.general || {}).forEach(key => {
        if (romanianSpecs.general[key]) {
          console.log(`${key}: ${romanianSpecs.general[key]}`);
        }
      });

      console.log('\n=== HARDWARE ===');
      Object.keys(romanianSpecs.hardware || {}).forEach(key => {
        if (romanianSpecs.hardware[key]) {
          console.log(`${key}: ${romanianSpecs.hardware[key]}`);
        }
      });

      console.log('\n=== DISPLAY ===');
      Object.keys(romanianSpecs.display || {}).forEach(key => {
        if (romanianSpecs.display[key]) {
          console.log(`${key}: ${romanianSpecs.display[key]}`);
        }
      });

      console.log('\n=== CONNECTIVITY ===');
      Object.keys(romanianSpecs.connectivity || {}).forEach(key => {
        if (romanianSpecs.connectivity[key]) {
          console.log(`${key}: ${romanianSpecs.connectivity[key]}`);
        }
      });

      console.log('\n=== FEATURES ===');
      Object.keys(romanianSpecs.features || {}).forEach(key => {
        if (romanianSpecs.features[key]) {
          console.log(`${key}: ${romanianSpecs.features[key]}`);
        }
      });

      console.log('\n=== COMPATIBILITY ===');
      Object.keys(romanianSpecs.compatibility || {}).forEach(key => {
        if (romanianSpecs.compatibility[key]) {
          console.log(`${key}: ${romanianSpecs.compatibility[key]}`);
        }
      });

      console.log('\n=== PACKAGE ===');
      Object.keys(romanianSpecs.package || {}).forEach(key => {
        if (romanianSpecs.package[key]) {
          console.log(`${key}: ${romanianSpecs.package[key]}`);
        }
      });

      // Check specifically for the truncated content
      console.log('\n=== CONTENT ANALYSIS ===');
      console.log('continutPachet full text:');
      console.log(romanianSpecs.package?.continutPachet || 'NOT FOUND');

      console.log('\nLooking for "Toate navigatiile tip TABLETA" text...');
      if (romanianSpecs.package?.continutPachet?.includes('Toate navigatiile tip TABLETA')) {
        console.log('✅ Additional package text found');
      } else {
        console.log('❌ Additional package text missing');
      }

    } else {
      console.log('❌ FAILED to extract specifications');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGiuliettaDetailed();