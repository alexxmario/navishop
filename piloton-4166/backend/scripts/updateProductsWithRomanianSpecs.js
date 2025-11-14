require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Sample Romanian specifications that we know are working
const sampleRomanianSpecs = {
  "navigatie-piloton-bmw-x3-e83-2003-2011-2k-8gb-256gb-8-core": {
    hardware: {
      memorieRAM: "8 GB",
      capacitateStocare: "256 GB",
      modelProcesor: "Octa Core"
    },
    display: {
      diagonalaDisplay: "9 Inch",
      rezolutieDisplay: "2000 x 1200",
      tehnologieDisplay: "QLED"
    },
    connectivity: {
      conectivitate: "Bluetooth, Cartela Sim, Subwoofer, USB, Wi-Fi",
      bluetooth: "DA",
      wifi: "Wi-Fi"
    },
    features: {
      functii: "Android Auto, Carplay",
      splitScreen: "Da, poti imparti ecranul si folosi 2 aplicatii in acelasi timp",
      suportAplicatiiAndroid: "Da, se poate instala orice aplicatie din magazinul Google Play",
      limbiInterfata: "Peste 60, inclusiv limba romana",
      preluareComenziVolan: "Da, vei putea folosi in continuare comenzile de pe volan cu noua navigatie"
    },
    package: {
      continutPachet: "2 Porturi USB, Antena Semnal Cartela Sim, Antena Semnal GPS, Cablu Preluare Camera Marsarier, Conectica Dedicata, Microfon Extern, Rama Adaptoare, Slot Cabluri RCA + Slot Cartela Sim, Tableta Android",
      formateMediaSuportate: "AVI, JPEG, MP3, MP4, MPEG1, MPEG2, MPEG4, PNG, WAV, WMA, WMV"
    },
    compatibility: {
      destinatPentru: "Autoturism, Autoutilitara",
      marca: "BMW",
      tipMontare: "In Bord"
    },
    general: {
      sku: "X3E8303118GB2KPO",
      categorii: "X3 E83 (2003-2011)",
      brand: "PilotOn",
      sistemOperare: "Android",
      harta: "Europa",
      tmc: "DA"
    },
    rawDetails: {
      "SKU": "X3E8303118GB2KPO",
      "Categorii": "X3 E83 (2003-2011)",
      "Brand": "PilotOn",
      "Memorie RAM": "8 GB",
      "Capacitate Stocare": "256 GB",
      "Model Procesor": "Octa Core",
      "Diagonala Display": "9 Inch",
      "Rezolutie Display": "2000 x 1200",
      "Tehnologie Display": "QLED",
      "Functii": "Android Auto, Carplay",
      "Conectivitate": "Bluetooth, Cartela Sim, Subwoofer, USB, Wi-Fi",
      "Destinat pentru": "Autoturism, Autoutilitara",
      "Marca": "BMW",
      "Tip Montare": "In Bord",
      "Preluare Comenzi Volan": "Da, vei putea folosi in continuare comenzile de pe volan cu noua navigatie",
      "Continut Pachet": "2 Porturi USB, Antena Semnal Cartela Sim, Antena Semnal GPS, Cablu Preluare Camera Marsarier, Conectica Dedicata, Microfon Extern, Rama Adaptoare, Slot Cabluri RCA + Slot Cartela Sim, Tableta Android",
      "Formate media suportate": "AVI, JPEG, MP3, MP4, MPEG1, MPEG2, MPEG4, PNG, WAV, WMA, WMV",
      "Sistem de Operare": "Android",
      "Tip Slot Memorie": "2 Porturi USB",
      "Conexiuni Externe": "Jack antena GPS, Jack antena radio, Port camera auto",
      "Harta": "Europa",
      "TMC": "DA",
      "Suport Aplicatii Android": "Da, se poate instala orice aplicatie din magazinul Google Play",
      "Split Screen": "Da, poti imparti ecranul si folosi 2 aplicatii in acelasi timp",
      "Limbi Interfata": "Peste 60, inclusiv limba romana",
      "Microfon": "DA",
      "Bluetooth": "DA"
    },
    scrapedAt: new Date()
  }
};

// Create a template for similar products based on their specifications
function generateRomanianSpecsFromProduct(product) {
  const romanianSpecs = {
    hardware: {},
    display: {},
    connectivity: {},
    features: {},
    package: {},
    compatibility: {},
    general: {},
    rawDetails: {},
    scrapedAt: new Date()
  };

  // Map from enhanced specs to Romanian specs
  if (product.detailedSpecs) {
    if (product.detailedSpecs.ram) {
      romanianSpecs.hardware.memorieRAM = product.detailedSpecs.ram;
      romanianSpecs.rawDetails["Memorie RAM"] = product.detailedSpecs.ram;
    }
    if (product.detailedSpecs.storage) {
      romanianSpecs.hardware.capacitateStocare = product.detailedSpecs.storage;
      romanianSpecs.rawDetails["Capacitate Stocare"] = product.detailedSpecs.storage;
    }
    if (product.detailedSpecs.processor) {
      romanianSpecs.hardware.modelProcesor = product.detailedSpecs.processor;
      romanianSpecs.rawDetails["Model Procesor"] = product.detailedSpecs.processor;
    }
  }

  if (product.displaySpecs) {
    if (product.displaySpecs.screenSize) {
      romanianSpecs.display.diagonalaDisplay = product.displaySpecs.screenSize;
      romanianSpecs.rawDetails["Diagonala Display"] = product.displaySpecs.screenSize;
    }
    if (product.displaySpecs.technology) {
      romanianSpecs.display.tehnologieDisplay = product.displaySpecs.technology;
      romanianSpecs.rawDetails["Tehnologie Display"] = product.displaySpecs.technology;
    }
    if (product.displaySpecs.resolution) {
      romanianSpecs.display.rezolutieDisplay = product.displaySpecs.resolution;
      romanianSpecs.rawDetails["Rezolutie Display"] = product.displaySpecs.resolution;
    }
  }

  // Connectivity
  if (product.connectivityOptions && product.connectivityOptions.length > 0) {
    romanianSpecs.connectivity.conectivitate = product.connectivityOptions.join(', ');
    romanianSpecs.rawDetails["Conectivitate"] = product.connectivityOptions.join(', ');

    if (product.connectivityOptions.some(opt => opt.toLowerCase().includes('bluetooth'))) {
      romanianSpecs.connectivity.bluetooth = "DA";
      romanianSpecs.rawDetails["Bluetooth"] = "DA";
    }

    if (product.connectivityOptions.some(opt => opt.toLowerCase().includes('wi-fi'))) {
      romanianSpecs.connectivity.wifi = "Wi-Fi";
    }
  }

  // Features
  if (product.technicalFeatures && product.technicalFeatures.length > 0) {
    const carplayAndroid = product.technicalFeatures.filter(f =>
      f.toLowerCase().includes('carplay') || f.toLowerCase().includes('android auto')
    );
    if (carplayAndroid.length > 0) {
      romanianSpecs.features.functii = "Android Auto, Carplay";
      romanianSpecs.rawDetails["Functii"] = "Android Auto, Carplay";
    }

    if (product.technicalFeatures.some(f => f.toLowerCase().includes('split screen'))) {
      romanianSpecs.features.splitScreen = "Da, poti imparti ecranul si folosi 2 aplicatii in acelasi timp";
      romanianSpecs.rawDetails["Split Screen"] = "Da, poti imparti ecranul si folosi 2 aplicatii in acelasi timp";
    }

    if (product.technicalFeatures.some(f => f.toLowerCase().includes('steering wheel'))) {
      romanianSpecs.features.preluareComenziVolan = "Da, vei putea folosi in continuare comenzile de pe volan cu noua navigatie";
      romanianSpecs.rawDetails["Preluare Comenzi Volan"] = "Da, vei putea folosi in continuare comenzile de pe volan cu noua navigatie";
    }
  }

  // General information
  romanianSpecs.general.brand = "PilotOn";
  romanianSpecs.general.sistemOperare = "Android";
  romanianSpecs.general.harta = "Europa";
  romanianSpecs.general.tmc = "DA";
  romanianSpecs.rawDetails["Brand"] = "PilotOn";
  romanianSpecs.rawDetails["Sistem de Operare"] = "Android";
  romanianSpecs.rawDetails["Harta"] = "Europa";
  romanianSpecs.rawDetails["TMC"] = "DA";

  // Compatibility
  romanianSpecs.compatibility.destinatPentru = "Autoturism, Autoutilitara";
  romanianSpecs.compatibility.tipMontare = "In Bord";
  romanianSpecs.rawDetails["Destinat pentru"] = "Autoturism, Autoutilitara";
  romanianSpecs.rawDetails["Tip Montare"] = "In Bord";

  // Extract car brand from product name or compatibility
  if (product.compatibility && product.compatibility.length > 0) {
    const carBrand = product.compatibility[0].brand;
    romanianSpecs.compatibility.marca = carBrand;
    romanianSpecs.rawDetails["Marca"] = carBrand;
  }

  // Extract categories from product name
  const nameWords = product.name.split(' ');
  const modelInfo = nameWords.slice(2, 6).join(' '); // Usually the car model info
  romanianSpecs.general.categorii = modelInfo;
  romanianSpecs.rawDetails["Categorii"] = modelInfo;

  // Generate SKU if available
  if (product.sku) {
    romanianSpecs.general.sku = product.sku.replace('PIL-', '') + 'PO';
    romanianSpecs.rawDetails["SKU"] = romanianSpecs.general.sku;
  }

  return romanianSpecs;
}

async function updateProductsWithRomanianSpecs() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // First, update the BMW X3 product with the exact specifications we have
    console.log('Updating BMW X3 product with exact Romanian specifications...');

    const bmwProduct = await Product.findOne({
      slug: "navigatie-piloton-bmw-x3-e83-2003-2011-2k-8gb-256gb-8-core"
    });

    if (bmwProduct) {
      await Product.findByIdAndUpdate(bmwProduct._id, {
        $set: {
          romanianSpecs: sampleRomanianSpecs["navigatie-piloton-bmw-x3-e83-2003-2011-2k-8gb-256gb-8-core"]
        }
      });
      console.log('✓ Updated BMW X3 product with Romanian specifications');
    } else {
      console.log('BMW X3 product not found');
    }

    // Now update other products with generated specifications
    console.log('\nGenerating Romanian specifications for other products...');

    const products = await Product.find({
      $and: [
        { $or: [{ romanianSpecs: { $exists: false } }, { "romanianSpecs.scrapedAt": { $exists: false } }] },
        { detailedSpecs: { $exists: true } },
        { $or: [{ "detailedSpecs.ram": { $exists: true } }, { "detailedSpecs.processor": { $exists: true } }] }
      ]
    }).limit(100); // Limit for testing

    console.log(`Found ${products.length} products to update with Romanian specifications`);

    let updatedCount = 0;

    for (const product of products) {
      try {
        const romanianSpecs = generateRomanianSpecsFromProduct(product);

        await Product.findByIdAndUpdate(product._id, {
          $set: { romanianSpecs: romanianSpecs }
        });

        updatedCount++;

        if (updatedCount % 20 === 0) {
          console.log(`Updated ${updatedCount}/${products.length} products...`);
        }

      } catch (error) {
        console.error(`Error updating product ${product.name}:`, error.message);
      }
    }

    console.log('\n=== ROMANIAN SPECIFICATIONS UPDATE RESULTS ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log('===============================================\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateProductsWithRomanianSpecs();