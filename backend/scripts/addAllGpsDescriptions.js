require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Helper function to create structured description sections
function createStructuredSections(productInfo) {
  const sections = [];

  if (productInfo.compatibility) {
    sections.push({
      title: 'Compatibilitate',
      icon: '🚚',
      points: productInfo.compatibility
    });
  }

  if (productInfo.about) {
    sections.push({
      title: 'Despre produs',
      icon: 'ℹ️',
      points: productInfo.about
    });
  }

  if (productInfo.performance) {
    sections.push({
      title: 'Performanță',
      icon: '⚡',
      points: productInfo.performance
    });
  }

  if (productInfo.display) {
    sections.push({
      title: 'Display',
      icon: '📺',
      points: productInfo.display
    });
  }

  if (productInfo.gps) {
    sections.push({
      title: 'GPS & Navigație',
      icon: '🗺️',
      points: productInfo.gps
    });
  }

  if (productInfo.connectivity) {
    sections.push({
      title: 'Conectivitate',
      icon: '🔗',
      points: productInfo.connectivity
    });
  }

  if (productInfo.camera) {
    sections.push({
      title: 'Camera DVR',
      icon: '📹',
      points: productInfo.camera
    });
  }

  if (productInfo.multimedia) {
    sections.push({
      title: 'Multimedia',
      icon: '🎵',
      points: productInfo.multimedia
    });
  }

  if (productInfo.package) {
    sections.push({
      title: 'Conținut pachet',
      icon: '📦',
      points: productInfo.package
    });
  }

  return sections;
}

// All GPS product descriptions
const gpsProducts = {
  'M9Plus': {
    sku: 'M9Plus',
    description: '<p>Acest sistem de navigatie este un aparat GPS cu o diagonala de 7 inch si ecran CAPACITIV potrivit oricarui autovehicul, realizat din materiale bine finisate si are o grosime de doar 12 mm. Este echipat cu un procesor de 800 Mhz, 256 MB RAM si 16 GB memorie interna, dar care poate fi extinsa pana la 32 GB printr-un card microSDHC.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'M9Plus' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' }, { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Procesor', value: 'Cortex A7 800Mhz' }, { key: 'RAM', value: '256 MB DDR2' },
      { key: 'Memorie', value: '16GB (posibilitate de marire a memoriei prin card microSDHC max 32 GB)' },
      { key: 'Sistem de operare', value: 'Windows C.E. 6.0' }, { key: 'WiFi', value: 'Nu' },
      { key: 'Magazin aplicatii', value: 'Nu' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Nu' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '190 x 112 x 11 mm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza, incarcator auto 1 m, incarcator auto 2.5 m, cablu miniUSB 2.0' }
    ],
    sections: {
      about: ['Display 7 inch CAPACITIV', 'Procesor Cortex A7 800MHz', 'RAM 256 MB DDR2', 'Memorie 16GB extensibila pana la 32GB', 'Sistem de operare Windows CE 6.0', 'Grosime doar 12mm'],
      gps: ['12 sateliti', '64 canale', 'Compatibil cu programe profesionale'],
      multimedia: ['Muzica: WMA9, MP3, WAV', 'Video: MPEG-4, Divx, Xvid, MPEG-2, ASF, AVI, WMV', 'Poze: JPG, BMP, GIF, PNG', 'Modulator FM (88 – 108MHz)', 'Jocuri incluse', 'E-book (format .txt)'],
      package: ['Dispozitiv GPS PilotOn M9Plus', 'Brat parbriz cu ventuza', 'Incarcator auto 1m', 'Incarcator auto 2.5m', 'Cablu miniUSB 2.0']
    }
  },

  'M9Plus-9837': {
    sku: 'M9Plus-9837',
    description: '<p>Acest sistem de navigatie este un aparat GPS cu o diagonala de 7 inch si ecran CAPACITIV potrivit oricarui autovehicul, realizat din materiale bine finisate si are o grosime de doar 12 mm. Este echipat cu un procesor de 800 Mhz, 256 MB RAM si 8 GB memorie interna, dar care poate fi extinsa pana la 32 GB printr-un card microSDHC.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'M9Plus' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' }, { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Procesor', value: 'Cortex A7 800Mhz' }, { key: 'RAM', value: '256 MB DDR2' },
      { key: 'Memorie', value: '8 GB (posibilitate de marire a memoriei prin card microSDHC max 32 GB)' },
      { key: 'Sistem de operare', value: 'Windows C.E. 6.0' }, { key: 'WiFi', value: 'Nu' },
      { key: 'Magazin aplicatii', value: 'Nu' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Nu' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '190 x 112 x 11 mm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza, incarcator auto 1 m, incarcator auto 2.5 m, cablu miniUSB 2.0' }
    ],
    sections: {
      about: ['Display 7 inch CAPACITIV', 'Procesor Cortex A7 800MHz', 'RAM 256 MB DDR2', 'Memorie 8GB extensibila pana la 32GB', 'Sistem de operare Windows CE 6.0', 'Grosime doar 12mm'],
      gps: ['12 sateliti', '64 canale', 'Compatibil cu programe profesionale'],
      multimedia: ['Muzica: WMA9, MP3, WAV', 'Video: MPEG-4, Divx, Xvid, MPEG-2, ASF, AVI, WMV', 'Poze: JPG, BMP, GIF, PNG', 'Modulator FM (88 – 108MHz)', 'Jocuri incluse', 'E-book (format .txt)'],
      package: ['Dispozitiv GPS PilotOn M9Plus 8GB', 'Brat parbriz cu ventuza', 'Incarcator auto 1m', 'Incarcator auto 2.5m', 'Cablu miniUSB 2.0']
    }
  },

  'A11S Pro': {
    sku: 'A11S Pro',
    description: '<p>Sistemul de navigatie PilotOn A11S Pro este urmasul modelului de succes PilotOn A11S.</p><p>Pentru confortul utilizatorului am adaugat la pachetul de accesorii si un suport de bord care permite montarea sistemului de navigatie in imediata apropiere a dumneavoastra, pe bordul vechiculului.</p><p>Procesorul QuadCore de 1,3GHz si memoria RAM de 1 GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si alte aplicatii din magazinul GooglePlay.</p><p>Memoria interna de 16GB acomodeaza cu usurinta stocarea de harti pentru mai multe programe de navigatie.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz si Autoturism cu setari gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update. Trafic Live (WiFi, in functie de programul utilizat) pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'A11S Pro' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' }, { key: 'Rezolutie', value: '1024×600 pixeli' },
      { key: 'Camera', value: 'Nu' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '1 GB DDR3' }, { key: 'Memorie', value: '16 GB (posibilitate de marire a memoriei prin card microSDHC max 128 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'Magazin aplicatii', value: 'Da, Google Play' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Da' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '180 x 110 x 12 mm' },
      { key: 'Accesorii', value: 'suport parbriz cu ventuza, incarcator auto USB-C 1.2 m, cablu USB C' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale', 'Trafic Live (WiFi) pentru blocaje, accidente, starea drumurilor'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 1 GB DDR3', 'Memorie 16GB (extensibila pana la 128 GB)', 'Android 6.0 cu Google Play', 'Utilizare concomitenta navigatie + alte aplicatii'],
      display: ['Ecran 7 inch CAPACITIV', 'Rezolutie 1024×600 pixeli', 'Calitate superioara de imagine'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Google Play Store', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn A11S Pro', 'Suport parbriz cu ventuza', 'Suport de bord', 'Incarcator auto USB-C 1.2m', 'Cablu USB C']
    }
  },

  'M14': {
    sku: 'M14',
    description: '<p>Va prezentam cel mai nou produs din gama PilotOn, singurul dispozitv WINCE cu 512 MB RAM.</p><p>Acest sistem de navigatie este un aparat GPS cu o diagonala de 7 inch si ecran CAPACITIV potrivit oricarui autovehicul, realizat din materiale bine finisate si are o grosime de doar 12 mm. Este echipat cu un procesor de 800 Mhz, 512 MB RAM si 16 GB memorie interna, dar care poate fi extinsa pana la 32 GB printr-un card microSDHC.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'M14' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' }, { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Procesor', value: 'Cortex A7 800Mhz' }, { key: 'RAM', value: '512 MB DDR2' },
      { key: 'Memorie', value: '16GB (posibilitate de marire a memoriei prin card microSDHC max 32 GB)' },
      { key: 'Sistem de operare', value: 'Windows C.E. 6.0' }, { key: 'WiFi', value: 'Nu' },
      { key: 'Magazin aplicatii', value: 'Nu' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Nu' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '193 x 113 x 25 mm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza, incarcator auto USB-C 1 m, cablu de date USB-C' }
    ],
    sections: {
      about: ['Singurul dispozitiv WINCE cu 512 MB RAM', 'Display 7 inch CAPACITIV', 'Procesor Cortex A7 800MHz', 'Memorie 16GB extensibila pana la 32GB', 'Sistem de operare Windows CE 6.0', 'Grosime doar 12mm'],
      gps: ['12 sateliti', '64 canale', 'Compatibil cu programe profesionale'],
      multimedia: ['Muzica: WMA9, MP3, WAV', 'Video: MPEG-4, Divx, Xvid, MPEG-2, ASF, AVI, WMV', 'Poze: JPG, BMP, GIF, PNG', 'Modulator FM (88 – 108MHz)', 'Jocuri incluse', 'E-book (format .txt)'],
      package: ['Dispozitiv GPS PilotOn M14', 'Brat parbriz cu ventuza', 'Incarcator auto USB-C 1m', 'Cablu de date USB-C']
    }
  },

  'A12S Pro': {
    sku: 'A12S Pro',
    description: '<p>Sistemul de navigatie PilotOn A12S Pro este urmasul modelului de succes PilotOn A11S Pro.</p><p>Procesorul QuadCore de 1,3GHz si memoria RAM de 2 GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si alte aplicatii din magazinul GooglePlay.</p><p>Memoria interna de 16GB acomodeaza cu usurinta stocarea de harti pentru mai multe programe de navigatie.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz si Autoturism cu setari gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update. Trafic Live (WiFi, in functie de programul utilizat) pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'A12S Pro' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV IPS (de sticla)' }, { key: 'Rezolutie', value: '800x480 pixeli' },
      { key: 'Camera', value: 'Nu' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '2 GB DDR3' }, { key: 'Memorie', value: '16 GB (posibilitate de marire a memoriei prin card microSDHC max 128 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'Magazin aplicatii', value: 'Da, Google Play' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Da' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '180 x 110 x 12 mm' },
      { key: 'Accesorii', value: 'suport parbriz cu ventuza, incarcator auto USB-C 1.2 m, cablu USB C' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale', 'Trafic Live (WiFi) pentru blocaje, accidente, starea drumurilor'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 2 GB DDR3', 'Memorie 16GB (extensibila pana la 128 GB)', 'Android 6.0 cu Google Play', 'Utilizare concomitenta navigatie + alte aplicatii'],
      display: ['Ecran 7 inch CAPACITIV IPS de sticla', 'Rezolutie 800x480 pixeli', 'Calitate superioara de imagine'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Google Play Store', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn A12S Pro', 'Suport parbriz cu ventuza', 'Incarcator auto USB-C 1.2m', 'Cablu USB C']
    }
  },

  'H12': {
    sku: 'H12',
    description: '<p>Sistemul de navigatie PilotOn H12 este urmasul modelului de succes PilotOn A12D PRO.</p><p>Sistemul de navigatie H12 are incorporata o camera auto DVR FullHD cu unghi larg si filmare WDR (wide dynamic range).</p><p>Suportand carduri pana la 128 GB permite o perioada marita de stocare a fisierelor video fata de aparatele care suporta maxim card de 32GB.</p><p>Senzorul CMOS de 8MP (cel mai mare din industrie) va permite captarea de fisiere video si foto la o calitate foarte buna.</p><p>Procesorul QuadCore de 1,3GHz si memoria RAM de 2 GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si camera DVR fara sa apara lag (intarzieri) sau blocare.</p><p>Memoria interna de 16GB acomodeaza cu usurinta stocarea de harti pentru mai multe programe de navigatie.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz si Autoturism cu setari gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update. Trafic Live (WiFi, in functie de programul utilizat) pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'H12' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' }, { key: 'Rezolutie', value: '1024×600 pixeli' },
      { key: 'Camera', value: 'Da' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '2 GB DDR3' }, { key: 'Memorie', value: '16 GB (posibilitate de marire a memoriei prin card microSDHC max 128 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'Magazin aplicatii', value: 'Nu' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Da' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '180 x 110 x 12 mm' },
      { key: 'Accesorii', value: 'suport parbriz cu ventuza, incarcator auto 1.2 m, incarcator auto 2 m, cablu miniUSB 2.0' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale', 'Trafic Live (WiFi) pentru blocaje, accidente, starea drumurilor'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 2 GB DDR3', 'Memorie 16GB (extensibila pana la 128 GB)', 'Android 6.0', 'Utilizare concomitenta navigatie + camera DVR fara lag'],
      camera: ['Camera auto DVR FullHD incorporata', 'Unghi larg de filmare', 'Filmare WDR (wide dynamic range)', 'Senzor CMOS 8MP (cel mai mare din industrie)', 'Suport carduri pana la 128GB pentru stocare video'],
      display: ['Ecran 7 inch CAPACITIV', 'Rezolutie 1024×600 pixeli'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn H12 cu camera DVR', 'Suport parbriz cu ventuza', 'Incarcator auto 1.2m', 'Incarcator auto 2m', 'Cablu miniUSB 2.0']
    }
  },

  'H11': {
    sku: 'H11',
    description: '<p>Sistemul de navigatie PilotOn H11 este urmasul modelului de succes PilotOn A11D PRO.</p><p>Sistemul de navigatie H11 are incorporata o camera auto DVR FullHD cu unghi larg si filmare WDR (wide dynamic range).</p><p>Suportand carduri pana la 128 GB permite o perioada marita de stocare a fisierelor video fata de aparatele care suporta maxim card de 32GB.</p><p>Senzorul CMOS de 8MP (cel mai mare din industrie) va permite captarea de fisiere video si foto la o calitate foarte buna.</p><p>Procesorul QuadCore de 1,3GHz si memoria RAM de 1 GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si camera DVR fara sa apara lag (intarzieri) sau blocare.</p><p>Memoria interna de 16GB acomodeaza cu usurinta stocarea de harti pentru mai multe programe de navigatie.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz si Autoturism cu setari gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update. Trafic Live (WiFi, in functie de programul utilizat) pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'H11' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '7 inch CAPACITIV' }, { key: 'Rezolutie', value: '1024×600 pixeli' },
      { key: 'Camera', value: 'Da' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '1 GB DDR3' }, { key: 'Memorie', value: '16 GB (posibilitate de marire a memoriei prin card microSDHC max 128 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'Magazin aplicatii', value: 'Da, Google Play' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Da' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '180 x 110 x 12 mm' },
      { key: 'Accesorii', value: 'suport parbriz cu ventuza, incarcator auto USB-C 1.2 m, cablu USB C' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale', 'Trafic Live (WiFi) pentru blocaje, accidente, starea drumurilor'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 1 GB DDR3', 'Memorie 16GB (extensibila pana la 128 GB)', 'Android 6.0 cu Google Play', 'Utilizare concomitenta navigatie + camera DVR fara lag'],
      camera: ['Camera auto DVR FullHD incorporata', 'Unghi larg de filmare', 'Filmare WDR (wide dynamic range)', 'Senzor CMOS 8MP (cel mai mare din industrie)', 'Suport carduri pana la 128GB pentru stocare video'],
      display: ['Ecran 7 inch CAPACITIV', 'Rezolutie 1024×600 pixeli'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Google Play Store', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn H11 cu camera DVR', 'Suport parbriz cu ventuza', 'Incarcator auto USB-C 1.2m', 'Cablu USB C']
    }
  },

  'P12XL': {
    sku: 'P12XL',
    description: '<p>PilotOn P12XL este succesorul lui A12XL si este un sistem de navigatie GPS cu camera DVR FullHD care beneficiaza de un display capacitiv multitouch antireflex de 9 inch dar beneficiaza si de un PARASOLAR direct in carcasa.</p><p>Beneficiind de cel mai mare display de pe piata in acest moment, PilotOn P12XL, este partenerul perfect de drum putand fi utilizat ca si navigatie sau pentru vizualizare fisiere video in conditii optime, pe un display capacitiv de 9 inch.</p><p>Având incorporată o cameră auto DVR FullHD cu unghi larg de 170 grade și filmare WDR (wide dynamic range) capteaza cu succes traseul parcus si eventualele evenimente rutiere.</p><p>Procesorul QuadCore de 1,3GHz si memoria RAM de 2GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si camera DVR.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism cu setari de gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'P12XL' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '9 inch CAPACITIV Multitouch in 5 puncte' }, { key: 'Rezolutie', value: '260 DPI' },
      { key: 'Camera', value: 'Da' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '2 GB DDR3' }, { key: 'Memorie', value: '16GB (posibilitate de marire a memoriei prin card microSDHC max 64 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'BT', value: 'Da' }, { key: 'Magazin aplicatii', value: 'Nu' },
      { key: 'Sateliti', value: '12 sateliti' }, { key: 'Canale', value: '64 canale' },
      { key: 'Bluetooth', value: 'Da' }, { key: 'Intrare video', value: 'Nu' },
      { key: 'Iesire audio', value: '3.5mm' }, { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' },
      { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '23.5 * 14 * 1.5cm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza XL, incarcator auto scurt (1m), incarcator auto lung(2m) cablu miniUSB 2' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari de gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 2 GB DDR3', 'Memorie 16GB (extensibila pana la 64 GB)', 'Android 6.0', 'Utilizare concomitenta navigatie + camera DVR'],
      camera: ['Camera auto DVR FullHD incorporata', 'Unghi larg de filmare 170 grade', 'Filmare WDR (wide dynamic range)', 'Capteaza traseul si eventualele evenimente rutiere'],
      display: ['Cel mai mare display de pe piata - 9 inch', 'CAPACITIV Multitouch in 5 puncte', 'Ecran antireflex', 'PARASOLAR incorporat in carcasa', 'Ideal pentru navigatie si vizualizare video'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn P12XL cu camera DVR', 'Brat parbriz cu ventuza XL', 'Incarcator auto scurt (1m)', 'Incarcator auto lung (2m)', 'Cablu miniUSB 2']
    }
  },

  'M14XL': {
    sku: 'M14XL',
    description: '<p>Va prezentam cel mai nou produs din gama PilotOn, singurul dispozitv WINCE cu 512 MB RAM.</p><p>Acest sistem de navigatie este un aparat GPS cu o diagonala de 9 inch si ecran CAPACITIV potrivit oricarui autovehicul, realizat din materiale bine finisate si are o grosime de doar 12 mm. Este echipat cu un procesor de 800 Mhz, 512 MB RAM si 16 GB memorie interna, dar care poate fi extinsa pana la 32 GB printr-un card microSDHC.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'M14XL' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '9 inch CAPACITIV' }, { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Procesor', value: 'Cortex A7 800Mhz' }, { key: 'RAM', value: '512 MB DDR2' },
      { key: 'Memorie', value: '16GB (posibilitate de marire a memoriei prin card microSDHC max 32 GB)' },
      { key: 'Sistem de operare', value: 'Windows C.E. 6.0' }, { key: 'WiFi', value: 'Nu' },
      { key: 'Magazin aplicatii', value: 'Nu' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Nu' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '235 * 140 * 15 mm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza, incarcator auto 1 m, cablu USB-C' }
    ],
    sections: {
      about: ['Singurul dispozitiv WINCE cu 512 MB RAM', 'Display 9 inch CAPACITIV', 'Procesor Cortex A7 800MHz', 'Memorie 16GB extensibila pana la 32GB', 'Sistem de operare Windows CE 6.0', 'Grosime doar 12mm'],
      gps: ['12 sateliti', '64 canale', 'Compatibil cu programe profesionale'],
      multimedia: ['Muzica: WMA9, MP3, WAV', 'Video: MPEG-4, Divx, Xvid, MPEG-2, ASF, AVI, WMV', 'Poze: JPG, BMP, GIF, PNG', 'Modulator FM (88 – 108MHz)', 'Jocuri incluse', 'E-book (format .txt)'],
      package: ['Dispozitiv GPS PilotOn M14XL', 'Brat parbriz cu ventuza', 'Incarcator auto 1m', 'Cablu USB-C']
    }
  },

  'M10XL': {
    sku: 'M10XL',
    description: '<p>Acest sistem de navigatie este un aparat GPS cu o diagonala de 9 inch si ecran CAPACITIV potrivit in special masinilor mari. Este echipat cu un procesor de 800 Mhz, 256 MB RAM si 8 GB memorie interna, dar care poate fi extinsa pana la 32 GB printr-un card microSDHC.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'M10XL' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '9 inch CAPACITIV' }, { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Procesor', value: 'Cortex A7 800Mhz' }, { key: 'RAM', value: '256 MB DDR2' },
      { key: 'Memorie', value: '8GB (posibilitate de marire a memoriei prin card microSDHC max 32 GB)' },
      { key: 'Sistem de operare', value: 'Windows C.E. 6.0' }, { key: 'WiFi', value: 'Nu' },
      { key: 'Magazin aplicatii', value: 'Nu' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Nu' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '250 x 150 x 25 mm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza, stylus, incarcator auto 1 m, incarcator auto 2.5 m, cablu miniUSB 2.0' }
    ],
    sections: {
      about: ['Display 9 inch CAPACITIV', 'Potrivit in special masinilor mari', 'Procesor Cortex A7 800MHz', 'RAM 256 MB DDR2', 'Memorie 8GB extensibila pana la 32GB', 'Sistem de operare Windows CE 6.0'],
      gps: ['12 sateliti', '64 canale', 'Compatibil cu programe profesionale'],
      multimedia: ['Muzica: WMA9, MP3, WAV', 'Video: MPEG-4, Divx, Xvid, MPEG-2, ASF, AVI, WMV', 'Poze: JPG, BMP, GIF, PNG', 'Modulator FM (88 – 108MHz)', 'Jocuri incluse', 'E-book (format .txt)'],
      package: ['Dispozitiv GPS PilotOn M10XL', 'Brat parbriz cu ventuza', 'Stylus', 'Incarcator auto 1m', 'Incarcator auto 2.5m', 'Cablu miniUSB 2.0']
    }
  },

  'P11XL': {
    sku: 'P11XL',
    description: '<p>PilotOn P11XL este un sistem de navigatie GPS cu camera DVR FullHD care beneficiaza de un display capacitiv multitouch antireflex de 9 inch dar beneficiaza si de un PARASOLAR direct in carcasa.</p><p>Beneficiind de cel mai mare display de pe piata in acest moment, PilotOn P11XL, este partenerul perfect de drum putand fi utilizat ca si navigatie sau pentru vizualizare fisiere video in conditii optime, pe un display capacitiv de 9 inch.</p><p>Având incorporată o cameră auto DVR FullHD cu unghi larg de 170 grade și filmare WDR (wide dynamic range) capteaza cu succes traseul parcus si eventualele evenimente rutiere.</p><p>Procesorul QuadCore de 1,3GHz si memoria RAM de 1GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si camera DVR.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism cu setari de gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'P11XL' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '9 inch CAPACITIV Multitouch in 5 puncte' }, { key: 'Rezolutie', value: '260 DPI' },
      { key: 'Camera', value: 'Da' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '1 GB DDR3' }, { key: 'Memorie', value: '16GB (posibilitate de marire a memoriei prin card microSDHC max 64 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'BT', value: 'Da' }, { key: 'Magazin aplicatii', value: 'Da, Google Play' },
      { key: 'Sateliti', value: '12 sateliti' }, { key: 'Canale', value: '64 canale' },
      { key: 'Bluetooth', value: 'Da' }, { key: 'Intrare video', value: 'Nu' },
      { key: 'Iesire audio', value: '3.5mm' }, { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' },
      { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da, .txt' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '23.5 * 14 * 1.5cm' },
      { key: 'Accesorii', value: 'brat parbriz cu ventuza XL, incarcator auto scurt (1m), incarcator auto lung(2m) cablu miniUSB 2' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari de gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 1 GB DDR3', 'Memorie 16GB (extensibila pana la 64 GB)', 'Android 6.0 cu Google Play', 'Utilizare concomitenta navigatie + camera DVR'],
      camera: ['Camera auto DVR FullHD incorporata', 'Unghi larg de filmare 170 grade', 'Filmare WDR (wide dynamic range)', 'Capteaza traseul si eventualele evenimente rutiere'],
      display: ['Cel mai mare display de pe piata - 9 inch', 'CAPACITIV Multitouch in 5 puncte', 'Ecran antireflex', 'PARASOLAR incorporat in carcasa', 'Ideal pentru navigatie si vizualizare video'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Google Play Store', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn P11XL cu camera DVR', 'Brat parbriz cu ventuza XL', 'Incarcator auto scurt (1m)', 'Incarcator auto lung (2m)', 'Cablu miniUSB 2']
    }
  },

  'A9XL': {
    sku: 'A9XL',
    description: '<p>Procesorul QuadCore de 1,3GHz si memoria RAM de 1 GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si alte aplicatii din magazinul GooglePlay.</p><p>Memoria interna de 16GB acomodeaza cu usurinta stocarea de harti pentru mai multe programe de navigatie.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz si Autoturism cu setari gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update. Trafic Live (WiFi, in functie de programul utilizat) pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'A9XL' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '9 inch CAPACITIV' }, { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Camera', value: 'Nu' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '1 GB DDR3' }, { key: 'Memorie', value: '16 GB (posibilitate de marire a memoriei prin card microSDHC max 128 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'Magazin aplicatii', value: 'Da, Google Play' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Da' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '23.5 * 14 * 1.5 cm' },
      { key: 'Accesorii', value: 'suport pentru parbriz cu ventuza, incarcator auto 1.2 m, incarcator auto 2 m, cablu miniUSB 2.0' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale', 'Trafic Live (WiFi) pentru blocaje, accidente, starea drumurilor'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 1 GB DDR3', 'Memorie 16GB (extensibila pana la 128 GB)', 'Android 6.0 cu Google Play', 'Utilizare concomitenta navigatie + alte aplicatii'],
      display: ['Ecran 9 inch CAPACITIV', 'Rezolutie 800×480 pixeli', 'Display mare ideal pentru navigatie'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Google Play Store', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn A9XL', 'Suport parbriz cu ventuza', 'Incarcator auto 1.2m', 'Incarcator auto 2m', 'Cablu miniUSB 2.0']
    }
  },

  'A10XL': {
    sku: 'A10XL',
    description: '<p>Procesorul QuadCore de 1,3GHz si memoria RAM de 2 GB va permit sa utilizati in acelasi timp, concomitent, atat programul de navigatie cat si alte aplicatii din magazinul GooglePlay.</p><p>Memoria interna de 16GB acomodeaza cu usurinta stocarea de harti pentru mai multe programe de navigatie.</p><p>Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz si Autoturism cu setari gabarit, Autohof, Toll Collect, Zone Industriale, Companii, Almacenas, Magazine, Camere, Extra POI, life update. Trafic Live (WiFi, in functie de programul utilizat) pentru anuntare blocaje, accidente, starea drumurilor, aglomeratie.</p>',
    specs: [
      { key: 'Brand', value: 'PilotOn' }, { key: 'Model', value: 'A10XL' }, { key: 'Carcasa', value: 'ABS' },
      { key: 'Ecran', value: '9 inch CAPACITIV' }, { key: 'Rezolutie', value: '800×480 pixeli' },
      { key: 'Camera', value: 'Nu' }, { key: 'Procesor', value: 'Quad Core Cortex A8 1.3 GHz' },
      { key: 'RAM', value: '2 GB DDR3' }, { key: 'Memorie', value: '16 GB (posibilitate de marire a memoriei prin card microSDHC max 128 GB)' },
      { key: 'Sistem de operare', value: 'Android 6.0' }, { key: 'WiFi', value: 'Da' },
      { key: 'Magazin aplicatii', value: 'NU' }, { key: 'Sateliti', value: '12 sateliti' },
      { key: 'Canale', value: '64 canale' }, { key: 'Bluetooth', value: 'Da' },
      { key: 'Intrare video', value: 'Nu' }, { key: 'Iesire audio', value: '3.5mm' },
      { key: 'Muzica', value: 'Da (WMA9, MP3 si WAV)' }, { key: 'Modulator FM', value: 'Da (88 – 108MHz)' },
      { key: 'Video', value: 'Da (MPEG-4, Divx, Xvid si MPEG-2, ASF, AVI, WMV)' },
      { key: 'Poze', value: 'Da (JPG, BMP, GIF, PNG)' }, { key: 'Jocuri', value: 'Da' },
      { key: 'E-book', value: 'Da' }, { key: 'Unelte', value: 'Calendar, calculator, convertor etc' },
      { key: 'Dimensiuni', value: '23.5 * 14 * 1.5 cm' },
      { key: 'Accesorii', value: 'suport pentru parbriz cu ventuza, incarcator auto 1.2 m, incarcator auto 2 m, cablu miniUSB 2.0' }
    ],
    sections: {
      compatibility: ['Compatibil cu toate programele de navigatie pentru TIR, Truck, Camion, Autocar, Microbuz și Autoturism', 'Setari gabarit pentru vehicule profesionale', 'Autohof, Toll Collect, Zone Industriale', 'Trafic Live (WiFi) pentru blocaje, accidente, starea drumurilor'],
      performance: ['Procesor Quad Core Cortex A8 1.3 GHz', 'RAM 2 GB DDR3 (performanta superioara)', 'Memorie 16GB (extensibila pana la 128 GB)', 'Android 6.0', 'Utilizare concomitenta navigatie + alte aplicatii'],
      display: ['Ecran 9 inch CAPACITIV', 'Rezolutie 800×480 pixeli', 'Display mare ideal pentru navigatie'],
      connectivity: ['WiFi integrat', 'Bluetooth', 'Modulator FM (88 – 108MHz)', 'Iesire audio 3.5mm'],
      package: ['Dispozitiv GPS PilotOn A10XL', 'Suport parbriz cu ventuza', 'Incarcator auto 1.2m', 'Incarcator auto 2m', 'Cablu miniUSB 2.0']
    }
  },

  'M8B7': {
    sku: 'M8B7',
    description: '<p>Aparat dedicat VW Passat B7 2010-2014</p><p>Interfata Android 12 cu ecran 10.36 inch 2K QLED. Echipat cu 4 GB Ram DDR3, 64 GB memorie interna si procesor Octa Core cu sistem de racire prin cooler.</p><p>Dispune de slot pentru cartela SIM 4G si functionalitate Hotspot Internet. Compatibil cu Apple Carplay Wireless si Android Auto pentru conectivitate completa cu smartphone-ul.</p><p>Include Bluetooth pentru telefon si audio, compatibilitate cu camera de marsarier si inregistrare trafic DVR.</p>',
    specs: [
      { key: 'Destinat', value: 'VW Passat B7 2010-2014' },
      { key: 'Interfata', value: 'Android 12' },
      { key: 'Ecran', value: '10.36 inch 2K QLED INCELL' },
      { key: 'RAM', value: '4 GB DDR3' },
      { key: 'Memorie', value: '64 GB' },
      { key: 'Procesor', value: 'Octa Core' },
      { key: 'Racire', value: 'Cooler' },
      { key: 'Slot Cartela Sim', value: '4G' },
      { key: 'Hotspot Internet', value: 'Da' },
      { key: 'Apple Carplay', value: 'Wireless' },
      { key: 'Android Auto', value: 'Da' },
      { key: 'Bluetooth Telefon', value: 'Da' },
      { key: 'Bluetooth Audio', value: 'Da' },
      { key: 'Camera Marsarier', value: 'Compatibil' },
      { key: 'DVR', value: 'Compatibil' },
      { key: 'An fabricatie', value: '2010-2014' }
    ],
    sections: {
      compatibility: ['Dedicat VW Passat B7 fabricatie 2010, 2011, 2012, 2013, 2014', 'Potrivire perfecta pentru bordul masinii'],
      performance: ['Procesor Octa Core de ultima generatie', 'RAM 4 GB DDR3', 'Memorie interna 64 GB', 'Sistem de racire prin cooler', 'Interfata Android 12'],
      display: ['Ecran 10.36 inch 2K QLED INCELL', 'Calitate imagine superioara', 'Tehnologie QLED pentru culori vibrante'],
      connectivity: ['Slot cartela SIM 4G', 'Hotspot Internet', 'Apple Carplay Wireless', 'Android Auto', 'Bluetooth telefon si audio'],
      camera: ['Compatibil cu camera de marsarier', 'Inregistrare trafic DVR']
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
    } else if (key.includes('modulator fm')) {
      romanianSpecs.features.modulatorFM = value;
    } else if (key.includes('camera')) {
      romanianSpecs.features.camera = value;
    } else if (key.includes('carplay')) {
      romanianSpecs.features.appleCarplay = value;
    } else if (key.includes('android auto')) {
      romanianSpecs.features.androidAuto = value;
    }

    // GPS
    else if (key.includes('sateliti')) {
      romanianSpecs.general.sateliti = value;
    } else if (key.includes('canale')) {
      romanianSpecs.general.canale = value;
    }

    // General
    else if (key.includes('sistem de operare') || key.includes('interfata')) {
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
    }

    // Compatibility
    else if (key.includes('destinat') || key.includes('potrivire')) {
      romanianSpecs.compatibility.destinatPentru = value;
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
async function updateProduct(productData) {
  try {
    const product = await Product.findOne({ sku: productData.sku });

    if (!product) {
      console.log(`❌ Product with SKU ${productData.sku} not found`);
      return false;
    }

    console.log(`\n📦 Updating: ${product.name}`);

    const updates = {
      description: productData.description.trim(),
      specifications: productData.specs,
      structuredDescription: {
        sections: createStructuredSections(productData.sections),
        originalDescription: productData.description,
        parsedAt: new Date()
      }
    };

    // Parse Romanian specs
    updates.romanianSpecs = parseRomanianSpecs(productData.specs);

    // Parse detailed specs
    const { detailedSpecs, displaySpecs } = parseDetailedSpecs(productData.specs);
    if (Object.keys(detailedSpecs).length > 0) {
      updates.detailedSpecs = detailedSpecs;
    }
    if (Object.keys(displaySpecs).length > 0) {
      updates.displaySpecs = displaySpecs;
    }

    // Update short description
    const plainText = productData.description.replace(/<[^>]*>/g, '').substring(0, 200);
    updates.shortDescription = plainText;

    await Product.findByIdAndUpdate(product._id, updates);

    console.log(`✅ Updated ${product.name}`);
    console.log(`   - Description: ${updates.description.length} chars`);
    console.log(`   - Structured sections: ${updates.structuredDescription.sections.length}`);
    console.log(`   - Specifications: ${updates.specifications.length}`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${productData.sku}: ${error.message}`);
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
    for (const [sku, productData] of Object.entries(gpsProducts)) {
      const success = await updateProduct(productData);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully updated: ${successCount}/${Object.keys(gpsProducts).length}`);
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

module.exports = { updateProduct, gpsProducts };
