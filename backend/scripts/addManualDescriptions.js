require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Manual product descriptions and specifications
const productDescriptions = {
  'M9Plus': {
    description: `
      <div class="product-description">
        <p>Acest sistem de navigatie este un aparat GPS cu o diagonala de 7 inch si ecran CAPACITIV potrivit oricarui autovehicul, realizat din materiale bine finisate si are o grosime de doar 12 mm. Este echipat cu un procesor de 800 Mhz, 256 MB RAM si 16 GB memorie interna, dar care poate fi extinsa pana la 32 GB printr-un card microSDHC.</p>
      </div>
    `,
    specifications: [
      { key: 'Brand', value: 'PilotOn' },
      { key: 'Model', value: 'M9Plus' },
      { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' },
      { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Procesor', value: 'Cortex A7 800Mhz' },
      { key: 'RAM', value: '256 MB DDR2' },
      { key: 'Memorie', value: '16GB (posibilitate de marire a memoriei prin card microSDHC max 32 GB)' },
      { key: 'Sistem de operare', value: 'Windows C.E. 6.0' },
      { key: 'WiFi', value: 'Nu' },
      { key: 'Magazin aplicatii', value: 'Nu' },
      { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' },
      { key: 'Bluetooth', value: 'Nu' },
      { key: 'Intrare video', value: 'Nu' },
      { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' },
      { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' },
      { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' },
      { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '190 x 112 x 11 mm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza, incarcator auto 1 m, incarcator auto 2.5 m, cablu miniUSB 2.0' }
    ],
    structuredDescription: {
      sections: [
        {
          title: 'Despre produs',
          icon: 'ℹ️',
          points: [
            'Display 7 inch CAPACITIV',
            'Procesor Cortex A7 800MHz',
            'RAM 256 MB DDR2',
            'Memorie 16GB extensibila pana la 32GB',
            'Sistem de operare Windows CE 6.0',
            'Grosime doar 12mm'
          ]
        },
        {
          title: 'GPS & Navigație',
          icon: '🗺️',
          points: [
            '12 sateliti',
            '64 canale',
            'Compatibil cu programe profesionale'
          ]
        },
        {
          title: 'Multimedia',
          icon: '🎵',
          points: [
            'Muzica: WMA9, MP3, WAV',
            'Video: MPEG-4, Divx, Xvid, MPEG-2, ASF, AVI, WMV',
            'Poze: JPG, BMP, GIF, PNG',
            'Modulator FM (88 – 108MHz)',
            'Jocuri incluse',
            'E-book (format .txt)'
          ]
        },
        {
          title: 'Conținut pachet',
          icon: '📦',
          points: [
            'Dispozitiv GPS PilotOn M9Plus',
            'Brat parbriz cu ventuza',
            'Incarcator auto 1m',
            'Incarcator auto 2.5m',
            'Cablu miniUSB 2.0'
          ]
        }
      ],
      originalDescription: 'Acest sistem de navigatie este un aparat GPS cu o diagonala de 7 inch...',
      parsedAt: new Date()
    }
  },
  'A11S Pro': {
    description: `
      <div class="product-description">
        <p>Sistemul de navigatie PilotOn A11S Pro este urmasul modelului de succes PilotOn A11S.</p>
        <p>Pentru confortul utilizatorului am adaugat la pachetul de accesorii si un suport de bord care permite montarea sistemului de navigatie in imediata apropiere a dumneavoastra, pe bordul vechiculului.</p>
        <p>Procesorul QuadCore de 1,3GHz si memoria RAM de 1 GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si alte aplicatii din magazinul GooglePlay.</p>
        <p>Memoria interna de 16GB acomodeaza cu usurinta stocarea de harti pentru mai multe programe de navigatie.</p>
        <p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz si Autoturism cu setari gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update. Trafic Live (WiFi, in functie de programul utilizat) pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie.</p>
      </div>
    `,
    specifications: [
      { key: 'Brand', value: 'PilotOn' },
      { key: 'Model', value: 'A11S Pro' },
      { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' },
      { key: 'Rezolutie', value: '1024×600 pixeli' },
      { key: 'Camera', value: 'Nu' },
      { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '1 GB DDR3' },
      { key: 'Memorie', value: '16 GB (posibilitate de marire a memoriei prin card microSDHC max 128 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' },
      { key: 'WiFi', value: 'Da' },
      { key: 'Magazin aplicatii', value: 'Da, Google Play' },
      { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' },
      { key: 'Bluetooth', value: 'Da' },
      { key: 'Intrare video', value: 'Nu' },
      { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' },
      { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' },
      { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da' },
      { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '180 x 110 x 12 mm' },
      { key: 'Accesorii', value: 'suport parbriz cu ventuza, incarcator auto USB-C 1.2 m, cablu USB C' }
    ],
    structuredDescription: {
      sections: [
        {
          title: 'Compatibilitate',
          icon: '🚚',
          points: [
            'Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism',
            'Setari gabarit pentru vehicule profesionale',
            'Autohof, Toll Collect, Zone Industriale',
            'Trafic Live (WiFi) pentru blocaje, accidente, starea drumurilor'
          ]
        },
        {
          title: 'Performanță',
          icon: '⚡',
          points: [
            'Procesor Quad Core Cortex A8 1.3 GHz',
            'RAM 1 GB DDR3',
            'Memorie 16GB (extensibila pana la 128 GB)',
            'Android 6.0 cu Google Play',
            'Utilizare concomitenta navigatie + alte aplicatii'
          ]
        },
        {
          title: 'Display',
          icon: '📺',
          points: [
            'Ecran 7 inch CAPACITIV',
            'Rezolutie 1024×600 pixeli',
            'Calitate superioara de imagine'
          ]
        },
        {
          title: 'Conectivitate',
          icon: '🔗',
          points: [
            'WiFi integrat',
            'Bluetooth',
            'Google Play Store',
            'Modulator FM (88 – 108MHz)',
            'Iesire audio 3.5mm'
          ]
        },
        {
          title: 'Conținut pachet',
          icon: '📦',
          points: [
            'Dispozitiv GPS PilotOn A11S Pro',
            'Suport parbriz cu ventuza',
            'Suport de bord',
            'Incarcator auto USB-C 1.2m',
            'Cablu USB C'
          ]
        }
      ],
      originalDescription: 'Sistemul de navigatie PilotOn A11S Pro este urmasul modelului de succes...',
      parsedAt: new Date()
    }
  },
  'P5': {
    description: `
      <div class="product-description">
        <h3>Compatibilitate</h3>
        <p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism cu setari de gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update.</p>
        <p><strong>Trafic Live (WiFi)</strong> pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie NU mai este disponibil.</p>
      </div>
    `,
    specifications: [
      { key: 'Brand', value: 'PilotOn' },
      { key: 'Model', value: 'P5' },
      { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '5 inch CAPACITIV' },
      { key: 'Rezolutie', value: '260 DPI' },
      { key: 'Camera', value: 'Nu' },
      { key: 'Procesor', value: 'Mediatek 800MHZ' },
      { key: 'RAM', value: '256 MB' },
      { key: 'Memorie', value: '8GB (posibilitate de marire a memoriei prin card microSDHC max 64 GB)' },
      { key: 'Sistem de operare', value: 'WINCE' },
      { key: 'WiFi', value: 'Nu' },
      { key: 'BT', value: 'Nu' },
      { key: 'Magazin aplicatii', value: 'Nu' },
      { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' },
      { key: 'Bluetooth', value: 'Nu' },
      { key: 'Intrare video', value: 'Nu' },
      { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' },
      { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' },
      { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' },
      { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '13 x 8 x 1 cm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza, incarcator auto scurt (1m), incarcator auto lung (2m) cablu miniUSB 2' }
    ],
    structuredDescription: {
      sections: [
        {
          title: 'Compatibilitate',
          icon: '🚚',
          points: [
            'Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism',
            'Setari de gabarit pentru vehicule profesionale',
            'Autohof, Toll Collect, Zone Industriale',
            'Companii, Almacenas, Magazine, Camere',
            'Extra POI, life update'
          ]
        },
        {
          title: 'Display',
          icon: '📺',
          points: [
            'Ecran 5 inch CAPACITIV',
            'Rezolutie 260 DPI',
            'Carcasa ABS rezistenta'
          ]
        },
        {
          title: 'Performanță',
          icon: '⚡',
          points: [
            'Procesor Mediatek 800MHz',
            'RAM 256 MB',
            'Memorie 8GB (extensibila prin microSDHC max 64 GB)',
            'Sistem de operare WINCE'
          ]
        },
        {
          title: 'GPS & Navigație',
          icon: '🗺️',
          points: [
            '12 sateliti',
            '64 canale',
            'Compatibil cu programe profesionale TIR/Camion'
          ]
        },
        {
          title: 'Multimedia',
          icon: '🎵',
          points: [
            'Muzica: WMA9, MP3, WAV',
            'Video: MPEG-4, Divx, Xvid, MPEG-2, ASF, AVI, WMV',
            'Poze: JPG, BMP, GIF, PNG',
            'Modulator FM (88 – 108MHz)',
            'Iesire audio 3.5mm',
            'Jocuri incluse',
            'E-book (format .txt)'
          ]
        },
        {
          title: 'Conținut pachet',
          icon: '📦',
          points: [
            'Dispozitiv GPS PilotOn P5',
            'Brat parbriz cu ventuza',
            'Incarcator auto scurt (1m)',
            'Incarcator auto lung (2m)',
            'Cablu miniUSB 2'
          ]
        }
      ],
      originalDescription: 'Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion...',
      parsedAt: new Date()
    }
  }
};

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

    // Hardware
    if (key.includes('procesor')) {
      romanianSpecs.hardware.modelProcesor = value;
    } else if (key.includes('ram')) {
      romanianSpecs.hardware.memorieRAM = value;
    } else if (key.includes('memorie') && !key.includes('ram')) {
      romanianSpecs.hardware.capacitateStocare = value;
    } else if (key.includes('carcasa')) {
      romanianSpecs.hardware.materialCarcasa = value;
    }

    // Display
    else if (key.includes('ecran')) {
      romanianSpecs.display.diagonalaDisplay = value;
    } else if (key.includes('rezolutie')) {
      romanianSpecs.display.rezolutieDisplay = value;
    }

    // Connectivity
    else if (key.includes('bluetooth') || key === 'bt') {
      romanianSpecs.connectivity.bluetooth = value;
    } else if (key.includes('wifi')) {
      romanianSpecs.connectivity.wifi = value;
    } else if (key.includes('iesire audio')) {
      romanianSpecs.connectivity.iesireAudio = value;
    }

    // Features
    else if (key.includes('muzica')) {
      romanianSpecs.features.muzica = value;
    } else if (key.includes('video')) {
      romanianSpecs.features.video = value;
    } else if (key.includes('poze')) {
      romanianSpecs.features.poze = value;
    } else if (key.includes('modulator fm')) {
      romanianSpecs.features.modulatorFM = value;
    } else if (key.includes('jocuri')) {
      romanianSpecs.features.jocuri = value;
    } else if (key.includes('e-book')) {
      romanianSpecs.features.ebook = value;
    } else if (key.includes('unelte')) {
      romanianSpecs.features.unelte = value;
    }

    // GPS
    else if (key.includes('sateliti')) {
      romanianSpecs.general.sateliti = value;
    } else if (key.includes('canale')) {
      romanianSpecs.general.canale = value;
    }

    // General
    else if (key.includes('sistem de operare')) {
      romanianSpecs.general.sistemOperare = value;
    } else if (key.includes('brand')) {
      romanianSpecs.general.brand = value;
    } else if (key.includes('model') && key === 'model') {
      romanianSpecs.general.model = value;
    } else if (key.includes('dimensiuni')) {
      romanianSpecs.general.dimensiuni = value;
    }

    // Package
    else if (key.includes('accesorii')) {
      romanianSpecs.package.continutPachet = value;
    } else if (key.includes('camera')) {
      romanianSpecs.additional.camera = value;
    }
  });

  return romanianSpecs;
}

// Parse detailed specs
function parseDetailedSpecs(specifications) {
  const detailedSpecs = {};
  const displaySpecs = {};

  specifications.forEach(spec => {
    const key = spec.key.toLowerCase();
    const value = spec.value;

    if (key.includes('procesor')) {
      detailedSpecs.processor = value;
    } else if (key.includes('ram')) {
      detailedSpecs.ram = value;
    } else if (key.includes('memorie') && !key.includes('ram')) {
      detailedSpecs.storage = value;
    } else if (key.includes('ecran')) {
      displaySpecs.screenSize = value;
    } else if (key.includes('rezolutie')) {
      displaySpecs.resolution = value;
    }
  });

  return { detailedSpecs, displaySpecs };
}

// Update a product with manual description
async function updateProduct(sku, data) {
  try {
    const product = await Product.findOne({ sku });

    if (!product) {
      console.log(`❌ Product with SKU ${sku} not found`);
      return false;
    }

    console.log(`\n📦 Updating: ${product.name}`);

    const updates = {
      description: data.description.trim(),
      specifications: data.specifications,
      structuredDescription: data.structuredDescription
    };

    // Parse Romanian specs
    updates.romanianSpecs = parseRomanianSpecs(data.specifications);

    // Parse detailed specs
    const { detailedSpecs, displaySpecs } = parseDetailedSpecs(data.specifications);
    if (Object.keys(detailedSpecs).length > 0) {
      updates.detailedSpecs = detailedSpecs;
    }
    if (Object.keys(displaySpecs).length > 0) {
      updates.displaySpecs = displaySpecs;
    }

    // Update short description
    const plainText = data.description.replace(/<[^>]*>/g, '').substring(0, 200);
    updates.shortDescription = plainText;

    await Product.findByIdAndUpdate(product._id, updates);

    console.log(`✅ Updated ${product.name}`);
    console.log(`   - Description: ${updates.description.length} chars`);
    console.log(`   - Structured sections: ${updates.structuredDescription.sections.length}`);
    console.log(`   - Specifications: ${updates.specifications.length}`);
    console.log(`   - Romanian specs categories: ${Object.keys(updates.romanianSpecs).filter(k => Object.keys(updates.romanianSpecs[k]).length > 0).length}`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${sku}: ${error.message}`);
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
  console.log('🚀 Adding manual GPS product descriptions...\n');
  console.log('='.repeat(60));

  try {
    await connectDB();

    let successCount = 0;
    let failCount = 0;

    // Update each product
    for (const [sku, data] of Object.entries(productDescriptions)) {
      const success = await updateProduct(sku, data);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('='.repeat(60));

    await mongoose.connection.close();
    console.log('\n✅ Done!\n');

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

module.exports = { updateProduct, productDescriptions };
