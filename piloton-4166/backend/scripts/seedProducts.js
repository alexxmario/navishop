require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

const sampleProducts = [
  {
    name: "Navigație GPS Android 2024 Pro",
    slug: "navigatie-gps-android-2024-pro",
    description: "Sistem de navigație GPS modern cu Android 13, ecran IPS de 7 inch, suport CarPlay și Android Auto. Actualizări pe viață și hărți TomTom preinstalate pentru Europa.",
    shortDescription: "GPS Android cu ecran 7\" și CarPlay/Android Auto",
    category: "navigatii-gps",
    subcategory: "android",
    brand: "NaviTech",
    model: "NT-7024",
    sku: "NT-GPS-7024-PRO",
    price: 1299,
    originalPrice: 1599,
    discount: 19,
    stock: 25,
    images: [
      {
        url: "/images/products/gps-android-pro-1.jpg",
        alt: "Navigație GPS Android Pro - față",
        isPrimary: true
      },
      {
        url: "/images/products/gps-android-pro-2.jpg",
        alt: "Navigație GPS Android Pro - spate"
      }
    ],
    specifications: [
      { key: "Sistem de operare", value: "Android 13" },
      { key: "Ecran", value: "7 inch IPS touchscreen" },
      { key: "Rezoluție", value: "1024x600 pixels" },
      { key: "Procesor", value: "Quad-core 1.6GHz" },
      { key: "RAM", value: "2GB DDR3" },
      { key: "Stocare", value: "32GB eMMC" },
      { key: "GPS", value: "Dual GPS (GPS + GLONASS)" },
      { key: "Conectivitate", value: "WiFi, Bluetooth 5.0, USB" },
      { key: "Suport", value: "CarPlay, Android Auto" }
    ],
    compatibility: [
      {
        brand: "Universal",
        models: ["Toate modelele"],
        years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
      }
    ],
    features: [
      "Actualizări hărți pe viață",
      "Suport CarPlay și Android Auto",
      "Navigație vocală în română",
      "Traffic în timp real",
      "Parking assist",
      "Speed camera alerts"
    ],
    inTheBox: [
      "Unitate GPS",
      "Suport auto",
      "Încărcător auto 12V",
      "Încărcător USB",
      "Manual utilizator",
      "Garanție 3 ani"
    ],
    weight: 450,
    dimensions: { length: 18, width: 11, height: 2 },
    warranty: 36,
    featured: true,
    newProduct: true,
    tags: ["gps", "android", "carplay", "navigation", "tomtom"]
  },
  {
    name: "Sistem Multimedia CarPlay Premium BMW",
    slug: "sistem-multimedia-carplay-premium-bmw",
    description: "Sistem multimedia premium pentru BMW cu CarPlay wireless, Android Auto, ecran tactil 10.25 inch și interfață originală BMW iDrive.",
    shortDescription: "Multimedia CarPlay pentru BMW cu ecran 10.25\"",
    category: "sisteme-multimedia",
    subcategory: "carplay",
    brand: "BMW",
    model: "iDrive Premium",
    sku: "BMW-CP-1025-PREM",
    price: 2199,
    originalPrice: 2499,
    discount: 12,
    stock: 15,
    images: [
      {
        url: "/images/products/bmw-carplay-1.jpg",
        alt: "BMW CarPlay Premium - instalat",
        isPrimary: true
      }
    ],
    specifications: [
      { key: "Ecran", value: "10.25 inch IPS" },
      { key: "Rezoluție", value: "1920x720 pixels" },
      { key: "Procesor", value: "Qualcomm Snapdragon" },
      { key: "RAM", value: "4GB" },
      { key: "Stocare", value: "64GB" },
      { key: "CarPlay", value: "Wireless + Wired" },
      { key: "Android Auto", value: "Wireless + Wired" },
      { key: "Conectivitate", value: "WiFi 5GHz, Bluetooth 5.0" }
    ],
    compatibility: [
      {
        brand: "BMW",
        models: ["Seria 1", "Seria 2", "Seria 3", "Seria 4", "Seria 5", "X1", "X2", "X3", "X4", "X5"],
        years: [2017, 2018, 2019, 2020, 2021, 2022, 2023]
      }
    ],
    features: [
      "CarPlay Wireless",
      "Android Auto Wireless", 
      "Interfață BMW originală",
      "Suport pentru comenzi volan",
      "Integrare iDrive",
      "Mirror Link"
    ],
    inTheBox: [
      "Unitate multimedia",
      "Cabluri instalare",
      "Adaptor CAN-Bus",
      "Manual instalare",
      "Garanție 2 ani"
    ],
    weight: 850,
    warranty: 24,
    featured: true,
    tags: ["bmw", "carplay", "multimedia", "idrive", "wireless"]
  },
  {
    name: "Cameră Marsarier 4K Ultra HD",
    slug: "camera-marsarier-4k-ultra-hd",
    description: "Cameră de marsarier cu rezoluție 4K Ultra HD, unghi de vizualizare 170°, vedere nocturnă superioară și linii de ghidare dinamice.",
    shortDescription: "Cameră marsarier 4K cu vedere nocturnă",
    category: "camere-marsarier",
    brand: "VisionTech",
    model: "VT-4K-170",
    sku: "VT-CAM-4K-170",
    price: 399,
    stock: 45,
    images: [
      {
        url: "/images/products/camera-4k-1.jpg",
        alt: "Cameră 4K marsarier",
        isPrimary: true
      }
    ],
    specifications: [
      { key: "Rezoluție", value: "4K Ultra HD (3840x2160)" },
      { key: "Unghi vizualizare", value: "170 grade" },
      { key: "Senzor", value: "Sony CMOS" },
      { key: "Vedere nocturnă", value: "Da, LED infraroșu" },
      { key: "Rezistență", value: "IP68 waterproof" },
      { key: "Alimentare", value: "12V DC" },
      { key: "Conectare", value: "RCA composite" }
    ],
    compatibility: [
      {
        brand: "Universal",
        models: ["Toate modelele cu sistem multimedia"],
        years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
      }
    ],
    features: [
      "Rezoluție 4K Ultra HD",
      "Vedere nocturnă LED",
      "Linii de ghidare dinamice",
      "Unghi larg 170°",
      "Rezistent la apă IP68",
      "Instalare rapidă"
    ],
    inTheBox: [
      "Cameră 4K",
      "Cablu video 5m",
      "Cablu alimentare", 
      "Kit montaj",
      "Manual instalare"
    ],
    weight: 180,
    warranty: 24,
    tags: ["camera", "marsarier", "4k", "night-vision", "waterproof"]
  },
  {
    name: "Navigație GPS Garmin DriveSmart 76",
    slug: "navigatie-gps-garmin-drivesmart-76",
    description: "GPS premium Garmin cu ecran 7 inch, hărți Europa preinstalate, trafic în timp real și comenzi vocale. Actualizări pe viață incluse.",
    shortDescription: "GPS Garmin 7\" cu hărți Europa și trafic",
    category: "navigatii-gps",
    subcategory: "garmin",
    brand: "Garmin",
    model: "DriveSmart 76",
    sku: "GARMIN-DS76-EUR",
    price: 899,
    stock: 30,
    images: [
      {
        url: "/images/products/garmin-ds76-1.jpg",
        alt: "Garmin DriveSmart 76",
        isPrimary: true
      }
    ],
    specifications: [
      { key: "Ecran", value: "7 inch capacitiv" },
      { key: "Rezoluție", value: "1024x600 pixels" },
      { key: "Hărți", value: "Europa 46 țări" },
      { key: "Actualizări", value: "Pe viață incluse" },
      { key: "Trafic", value: "Live traffic inclus" },
      { key: "WiFi", value: "802.11 b/g/n" },
      { key: "Bluetooth", value: "Da, pentru telefon" }
    ],
    compatibility: [
      {
        brand: "Universal",
        models: ["Toate vehiculele"],
        years: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
      }
    ],
    features: [
      "Hărți Europa preinstalate",
      "Actualizări pe viață",
      "Trafic în timp real",
      "Comenzi vocale",
      "Points of Interest",
      "Trip planner"
    ],
    inTheBox: [
      "GPS Garmin DriveSmart 76",
      "Suport auto cu ventuză",
      "Cablu USB",
      "Încărcător auto",
      "Manual utilizator"
    ],
    weight: 280,
    warranty: 12,
    featured: true,
    tags: ["garmin", "gps", "europa", "traffic", "voice-control"]
  },
  {
    name: "Sistem Android Auto Wireless Audi",
    slug: "sistem-android-auto-wireless-audi",
    description: "Retrofit Android Auto wireless pentru Audi cu MMI, compatibil cu modelele 2016-2023. Instalare plug-and-play fără modificări.",
    shortDescription: "Android Auto wireless pentru Audi MMI",
    category: "carplay-android", 
    subcategory: "android-auto",
    brand: "Audi",
    model: "MMI Wireless",
    sku: "AUDI-AAW-MMI-23",
    price: 1599,
    stock: 20,
    images: [
      {
        url: "/images/products/audi-android-auto-1.jpg",
        alt: "Audi Android Auto Wireless",
        isPrimary: true
      }
    ],
    specifications: [
      { key: "Compatibilitate", value: "Audi MMI 2016-2023" },
      { key: "Android Auto", value: "Wireless + Wired" },
      { key: "Instalare", value: "Plug and Play" },
      { key: "Procesor", value: "ARM Cortex A7" },
      { key: "Conectivitate", value: "WiFi 5GHz, Bluetooth 5.0" },
      { key: "Alimentare", value: "12V prin MMI" }
    ],
    compatibility: [
      {
        brand: "Audi",
        models: ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "TT"],
        years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]
      }
    ],
    features: [
      "Android Auto Wireless",
      "Instalare fără modificări",
      "Păstrează funcțiile originale",
      "Suport comenzi volan",
      "Mirror Link",
      "Actualizări OTA"
    ],
    inTheBox: [
      "Modul Android Auto",
      "Cabluri conectare",
      "Manual instalare",
      "Suport tehnic",
      "Garanție 2 ani"
    ],
    weight: 120,
    warranty: 24,
    tags: ["audi", "android-auto", "wireless", "mmi", "retrofit"]
  }
];

const seedProducts = async () => {
  try {
    console.log('Clearing existing products...');
    await Product.deleteMany({});
    
    console.log('Seeding products...');
    const products = await Product.insertMany(sampleProducts);
    
    console.log(`Successfully seeded ${products.length} products:`);
    products.forEach(product => {
      console.log(`- ${product.name} (${product.sku})`);
    });
    
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

const runSeed = async () => {
  await connectDB();
  await seedProducts();
  mongoose.connection.close();
  console.log('Seeding completed and database connection closed.');
};

if (require.main === module) {
  runSeed();
}

module.exports = { seedProducts, sampleProducts };