const DescriptionParser = require('./services/descriptionParser');

// Test with the sample text provided
const sampleText = `Detalii și Ce Conține Pachetul Mai jos găsești prezentarea tabletei PilotOn, împreună cu toate accesoriile incluse în pachet. Montaj ușor, tip Plug & Play Dispozitivul se integrează perfect în bord, fără a fi nevoie de intervenții asupra instalației electrice originale. Funcțiile de pe volan rămân active, iar sistemul se oprește automat odată cu scoaterea contactului. Pachetul conține rama și toate cablurile necesare pentru instalare, adaptate modelului dumneavoastră auto. Control de pe volan Compatibil cu comenzile originale ale volanului, permițând utilizarea lor fără modificări. De asemenea, oferă posibilitatea instalării unor kituri de comenzi aftermarket pentru vehiculele care nu sunt echipate din fabrică cu această funcție. CarPlay & Android Auto Wireless Conectează telefonul fără cabluri și accesează rapid aplicații utile precum hărți, muzică sau apeluri, direct pe display-ul mașinii. Interfața este intuitivă, compatibilă cu comenzile vocale Siri sau Google Assistant, pentru o experiență sigură și fără distrageri în timpul condusului. Compatibil cu cameră frontală, DVR și cameră de marșarier Sistemul permite conectarea unei camere frontale pentru manevre precise la parcare, a unei camere DVR pentru înregistrarea traficului în timp real, precum și a unei camere de marșarier pentru un plus de siguranță la mersul înapoi. Procesor Quad Core Ecran INCELL cu performanță superioară Echipat cu un display INCELL luminos și detaliat, oferă culori vii, claritate excelentă și un răspuns tactil rapid și precis pentru o experiență vizuală de top. Sistem audio cu egalizator și procesor DSP Include un egalizator integrat și procesor digital de sunet (DSP), oferind posibilitatea de a personaliza fin sunetul pentru o calitate audio superioară adaptată interiorului mașinii. Conexiune Wi-Fi 2.4G prin Hotspot Oferă acces stabil la internet, cu acoperire bună și performanță echilibrată, ideală pentru utilizarea continuă a funcțiilor online din sistemul multimedia. Bluetooth, Apeluri Hands-Free și Conexiune AUX Permite conectarea wireless a telefonului prin Bluetooth pentru muzică și convorbiri fără mâini, iar pentru opțiuni suplimentare de redare audio, este disponibilă și intrarea AUX cu cablu. Sistem de navigație GPS integrat Suportă aplicații populare precum Waze, Google Maps și altele, furnizând orientare exactă în timp real și informații actualizate despre trafic. Radio FM/AM cu RDS și acces la posturi online Oferă recepție FM/AM de calitate, cu funcție RDS pentru afișarea automată a informațiilor despre posturile ascultate. De asemenea, permite ascultarea radiourilor online prin conexiune la internet. Ecran Împărțit si Multitasking Permite vizualizarea a două aplicații în paralel pe ecran, îmbunătățind multitasking-ul pentru a reda aplicațiile telefonului direct pe ecranul sistemului de navigație. Senzori de parcare, climatizare și încălzire în scaune Permite gestionarea senzorilor de parcare, a încălzirii în scaune și a controlului climatizării direct prin sistemul de navigație, cu condiția ca vehiculul să fie compatibil cu aceste funcții`;

function testDescriptionParser() {
  console.log('Testing Description Parser...\n');

  const parser = new DescriptionParser();
  const result = parser.parseDescription(sampleText);

  console.log('=== ORGANIZED SECTIONS ===\n');

  result.sections.forEach((section, index) => {
    console.log(`${section.icon} ${section.title}`);
    section.points.forEach(point => {
      console.log(`  • ${point}`);
    });
    console.log('');
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total sections created: ${result.sections.length}`);
  console.log(`Original text length: ${sampleText.length} characters`);
  console.log(`Sections: ${result.sections.map(s => s.title.replace(/[^\w\s]/g, '')).join(', ')}`);

  // Test preview functionality
  console.log('\n=== PREVIEW (First 2 sections) ===');
  const preview = parser.getPreview(sampleText, 2);
  preview.preview.forEach(section => {
    console.log(`${section.icon} ${section.title}`);
    section.points.slice(0, 2).forEach(point => {
      console.log(`  • ${point}`);
    });
    if (section.points.length > 2) {
      console.log(`  ... și încă ${section.points.length - 2} puncte`);
    }
    console.log('');
  });

  if (preview.hasMore) {
    console.log(`... și încă ${preview.sectionsCount - 2} secțiuni`);
  }
}

testDescriptionParser();