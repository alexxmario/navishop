const axios = require('axios');
const cheerio = require('cheerio');

async function extractDetailedSpecs() {
  try {
    // Test the BMW product you mentioned
    const testUrl = 'https://www.navi-abc.ro/cumpara/navigatie-piloton-bmw-seria-1-2004-2011-9-inch-2gb-32gb-4-core-7450';

    console.log('Extracting detailed specifications from:', testUrl);
    console.log('================================================\n');

    const response = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract from the product-details section
    const productDetails = $('.product-details');

    if (productDetails.length > 0) {
      console.log('=== FOUND PRODUCT DETAILS SECTION ===\n');

      // Get the raw text and clean it up
      const detailsText = productDetails.text();

      // Extract all specifications using the pattern you showed
      const specifications = {};

      // Helper function to extract specification values
      function extractSpec(text, key) {
        const regex = new RegExp(key + '\\s*([\\s\\S]*?)(?=' +
          'SKU|Categorii|Brand|Memorie RAM|Capacitate Stocare|Model Procesor|' +
          'Diagonala Display|Rezolutie Display|Tehnologie Display|Functii|' +
          'Conectivitate|Destinat pentru|Marca|Tip Montare|Preluare Comenzi|' +
          'Continut Pachet|Formate media|Sistem de Operare|Tip Slot|' +
          'Conexiuni Externe|Harta|TMC|Suport Aplicatii|Split Screen|' +
          'Limbi Interfata|Microfon|Bluetooth|Limitari|$)', 'i');

        const match = text.match(regex);
        return match ? match[1].trim().replace(/\s+/g, ' ') : null;
      }

      // Extract all the specifications
      specifications.sku = extractSpec(detailsText, 'SKU');
      specifications.categorii = extractSpec(detailsText, 'Categorii');
      specifications.brand = extractSpec(detailsText, 'Brand');
      specifications.memorieRAM = extractSpec(detailsText, 'Memorie RAM');
      specifications.capacitateStocare = extractSpec(detailsText, 'Capacitate Stocare');
      specifications.modelProcesor = extractSpec(detailsText, 'Model Procesor');
      specifications.diagonalaDisplay = extractSpec(detailsText, 'Diagonala Display');
      specifications.rezolutieDisplay = extractSpec(detailsText, 'Rezolutie Display');
      specifications.tehnologieDisplay = extractSpec(detailsText, 'Tehnologie Display');
      specifications.functii = extractSpec(detailsText, 'Functii');
      specifications.conectivitate = extractSpec(detailsText, 'Conectivitate');
      specifications.destinatPentru = extractSpec(detailsText, 'Destinat pentru');
      specifications.marca = extractSpec(detailsText, 'Marca');
      specifications.tipMontare = extractSpec(detailsText, 'Tip Montare');
      specifications.preluareComenzi = extractSpec(detailsText, 'Preluare Comenzi Volan');
      specifications.continutPachet = extractSpec(detailsText, 'Continut Pachet');
      specifications.formateMedia = extractSpec(detailsText, 'Formate media suportate');
      specifications.sistemOperare = extractSpec(detailsText, 'Sistem de Operare');
      specifications.tipSlotMemorie = extractSpec(detailsText, 'Tip Slot Memorie');
      specifications.conexiuniExterne = extractSpec(detailsText, 'Conexiuni Externe');
      specifications.harta = extractSpec(detailsText, 'Harta');
      specifications.tmc = extractSpec(detailsText, 'TMC');
      specifications.suportAplicatii = extractSpec(detailsText, 'Suport Aplicatii Android');
      specifications.splitScreen = extractSpec(detailsText, 'Split Screen');
      specifications.limbiInterfata = extractSpec(detailsText, 'Limbi Interfata');
      specifications.microfon = extractSpec(detailsText, 'Microfon');
      specifications.bluetooth = extractSpec(detailsText, 'Bluetooth');
      specifications.limitari = extractSpec(detailsText, 'Limitari');

      console.log('=== EXTRACTED SPECIFICATIONS ===\n');
      Object.keys(specifications).forEach(key => {
        if (specifications[key]) {
          console.log(`${key}: ${specifications[key]}`);
        }
      });

      console.log('\n=== ORGANIZED INTO CATEGORIES ===\n');

      const organizedSpecs = {
        general: {
          sku: specifications.sku,
          brand: specifications.brand,
          categorii: specifications.categorii,
          sistemOperare: specifications.sistemOperare,
          marca: specifications.marca
        },
        hardware: {
          memorieRAM: specifications.memorieRAM,
          capacitateStocare: specifications.capacitateStocare,
          modelProcesor: specifications.modelProcesor
        },
        display: {
          diagonalaDisplay: specifications.diagonalaDisplay,
          rezolutieDisplay: specifications.rezolutieDisplay,
          tehnologieDisplay: specifications.tehnologieDisplay
        },
        connectivity: {
          conectivitate: specifications.conectivitate,
          bluetooth: specifications.bluetooth,
          microfon: specifications.microfon
        },
        features: {
          functii: specifications.functii,
          suportAplicatii: specifications.suportAplicatii,
          splitScreen: specifications.splitScreen,
          harta: specifications.harta,
          tmc: specifications.tmc,
          limbiInterfata: specifications.limbiInterfata
        },
        compatibility: {
          destinatPentru: specifications.destinatPentru,
          tipMontare: specifications.tipMontare,
          preluareComenzi: specifications.preluareComenzi,
          limitari: specifications.limitari
        },
        package: {
          continutPachet: specifications.continutPachet,
          formateMedia: specifications.formateMedia,
          tipSlotMemorie: specifications.tipSlotMemorie,
          conexiuniExterne: specifications.conexiuniExterne
        }
      };

      console.log('GENERAL:');
      Object.keys(organizedSpecs.general).forEach(key => {
        if (organizedSpecs.general[key]) {
          console.log(`  ${key}: ${organizedSpecs.general[key]}`);
        }
      });

      console.log('\nHARDWARE:');
      Object.keys(organizedSpecs.hardware).forEach(key => {
        if (organizedSpecs.hardware[key]) {
          console.log(`  ${key}: ${organizedSpecs.hardware[key]}`);
        }
      });

      console.log('\nDISPLAY:');
      Object.keys(organizedSpecs.display).forEach(key => {
        if (organizedSpecs.display[key]) {
          console.log(`  ${key}: ${organizedSpecs.display[key]}`);
        }
      });

      console.log('\nCONNECTIVITY:');
      Object.keys(organizedSpecs.connectivity).forEach(key => {
        if (organizedSpecs.connectivity[key]) {
          console.log(`  ${key}: ${organizedSpecs.connectivity[key]}`);
        }
      });

      console.log('\nFEATURES:');
      Object.keys(organizedSpecs.features).forEach(key => {
        if (organizedSpecs.features[key]) {
          console.log(`  ${key}: ${organizedSpecs.features[key]}`);
        }
      });

      console.log('\nCOMPATIBILITY:');
      Object.keys(organizedSpecs.compatibility).forEach(key => {
        if (organizedSpecs.compatibility[key]) {
          console.log(`  ${key}: ${organizedSpecs.compatibility[key]}`);
        }
      });

      console.log('\nPACKAGE:');
      Object.keys(organizedSpecs.package).forEach(key => {
        if (organizedSpecs.package[key]) {
          console.log(`  ${key}: ${organizedSpecs.package[key]}`);
        }
      });

    } else {
      console.log('❌ Product details section not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

extractDetailedSpecs();