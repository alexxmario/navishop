class DescriptionParser {
  constructor() {
    // Define section patterns and their associated keywords
    this.sectionPatterns = {
      packageInstallation: {
        title: "🔧 Montaj ușor, tip Plug & Play",
        keywords: [
          'pachet', 'conține', 'instalare', 'montaj', 'plug & play', 'plug&play',
          'ram', 'cabluri', 'adaptoare', 'fără modificări', 'instalații electrice',
          'contactului', 'accesorii', 'unboxing', 'detalii și ce conține'
        ],
        icon: "🔧",
        extractTitle: /^Montaj\s+ușor,?\s+tip\s+Plug\s*&\s*Play\s*/i,
        titleExtractPattern: 'Montaj ușor, tip Plug & Play'
      },
      vehicleIntegration: {
        title: "🚗 Integrare Vehicul",
        keywords: [
          'control de pe volan', 'comenzi volan', 'funcții volan', 'steering wheel',
          'oprește automat', 'scoaterea contactului', 'compatibil cu comenzile',
          'aftermarket', 'echipate din fabrică'
        ],
        icon: "🚗"
      },
      smartConnectivity: {
        title: "📱 CarPlay & Android Auto Wireless",
        keywords: [
          'carplay', 'android auto', 'wireless', 'fără cabluri', 'bluetooth',
          'hands-free', 'wi-fi', 'hotspot', 'internet', 'conexiune', 'telefon',
          'siri', 'google assistant', 'comenzi vocale'
        ],
        icon: "📱",
        extractTitle: /^(CarPlay\s*&\s*Android\s+Auto\s+Wireless|Play\s*&\s*Android\s+Auto\s+Wireless)\s*/i,
        titleExtractPattern: 'CarPlay & Android Auto Wireless'
      },
      cameraSupport: {
        title: "📷 Compatibil cu cameră frontală, DVR și cameră de marșarier",
        keywords: [
          'cameră frontală', 'cameră marsarier', 'dvr', 'camera auto',
          'înregistrarea traficului', 'parcare', 'manevre precise',
          'siguranță', 'mersul înapoi', 'camera', 'camere'
        ],
        icon: "📷",
        extractTitle: /^Compatibil\s+cu\s+cameră\s+frontală,?\s+DVR\s+și\s+cameră\s+de\s+marșarier\s*/i,
        titleExtractPattern: 'Compatibil cu cameră frontală, DVR și cameră de marșarier'
      },
      displayHardware: {
        title: "🎨 Teme și Interfețe Preinstalate pe Tabletă",
        keywords: [
          'procesor', 'quad core', 'octa core', 'core', 'ecran', 'display',
          'incell', 'qled', 'oled', 'luminozitate', 'rezoluție', 'tactil',
          'performanță', 'culori', 'claritate', 'tehnologie', '2k', '4k',
          'inch', 'diagonal', 'interfețe preinstalate', 'teme'
        ],
        icon: "🎨",
        extractTitle: /^Teme\s+și\s+Interfețe\s+Preinstalate\s+pe\s+Tabletă\s*/i,
        titleExtractPattern: 'Teme și Interfețe Preinstalate pe Tabletă'
      },
      audioSound: {
        title: "🔊 Sistem audio cu egalizator și Procesor DSP",
        keywords: [
          'audio', 'sunet', 'egalizator', 'dsp', 'procesor digital',
          'calitate audio', 'personalizare', 'radio', 'fm', 'am',
          'rds', 'posturi online', 'redare', 'muzică'
        ],
        icon: "🔊",
        extractTitle: /^Sistem\s+audio\s+cu\s+egalizator\s+și\s+Procesor\s+DSP\s*/i,
        titleExtractPattern: 'Sistem audio cu egalizator și Procesor DSP',
        customFirstPoint: 'Include un egalizator integrat și procesor digital de sunet (DSP), oferind posibilitatea de a personaliza fin sunetul pentru o calitate audio superioară adaptată interiorului mașinii'
      },
      navigation: {
        title: "🗺️ Sistem de navigație GPS integrat",
        keywords: [
          'navigație', 'gps', 'hărți', 'waze', 'google maps', 'maps',
          'orientare', 'timp real', 'trafic', 'informații actualizate',
          'rutare', 'localizare'
        ],
        icon: "🗺️",
        extractTitle: /^Sistem\s+de\s+navigație\s+GPS\s+integrat\s*/i,
        titleExtractPattern: 'Sistem de navigație GPS integrat'
      },
      advancedFeatures: {
        title: "🎮 Ecran Împărțit si Multitasking",
        keywords: [
          'split screen', 'ecran împărțit', 'multitasking', 'aplicații',
          'paralel', 'două aplicații', 'aplicații telefon', 'multimedia',
          'personalizare', 'android', 'google play'
        ],
        icon: "🎮",
        extractTitle: /^Ecran\s+Împărțit\s+si?\s+Multitasking\s*/i,
        titleExtractPattern: 'Ecran Împărțit si Multitasking'
      },
      autoIntegration: {
        title: "⚙️ Senzori de parcare, climatizare și încălzire în scaune",
        keywords: [
          'senzori parcare', 'climatizare', 'încălzire scaune',
          'control climă', 'vehicul compatibil', 'funcții auto',
          'integrare', 'gestionare', 'scaune încălzite'
        ],
        icon: "⚙️",
        extractTitle: /^Senzori\s+de\s+parcare,?\s+climatizare\s+și\s+încălzire\s+în\s+scaune\s*/i,
        titleExtractPattern: 'Senzori de parcare, climatizare și încălzire în scaune'
      }
    };
  }

  parseDescription(description) {
    if (!description || typeof description !== 'string') {
      return { sections: [], originalDescription: description };
    }

    // Clean up the description
    let cleanText = this.cleanText(description);

    // Split into sentences and analyze
    const sentences = this.splitIntoSentences(cleanText);

    // Group sentences by section
    const sections = this.groupSentencesBySection(sentences);

    // Format sections for display
    const formattedSections = this.formatSections(sections);

    return {
      sections: formattedSections,
      originalDescription: description
    };
  }

  cleanText(text) {
    // Remove CDATA wrappers
    text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');

    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Remove unwanted promotional text
    text = text.replace(/Va\s+mul[țt]umim\s+c[ăa]\s+a[țt]i\s+ales\s+produsele\s+NAVI-ABC[!.]?\s*/gi, '');

    // Remove video unboxing references
    text = text.replace(/^Unboxing\s+Tableta\s*[–-]?\s*/i, '');
    text = text.replace(/\bUnboxing\s+Tableta\b[^.]*\./gi, '');
    text = text.replace(/Mai\s+jos\s+găsești\s+prezentarea\s+tabletei[^.]*\./gi, '');

    // Fix common spacing issues
    text = text.replace(/([a-z])([A-Z])/g, '$1. $2');
    text = text.replace(/\s+/g, ' ');
    text = text.trim();

    return text;
  }

  splitIntoSentences(text) {
    // Define topic headers that should start new sections
    const topicHeaders = [
      'Detalii și Ce Conține', 'Montaj ușor', 'Control de pe volan',
      'CarPlay & Android Auto', 'Compatibil cu cameră', 'Procesor',
      'Ecran INCELL', 'Sistem audio', 'Conexiune Wi-Fi', 'Bluetooth',
      'Sistem de navigație', 'Radio FM/AM', 'Ecran Împărțit', 'Senzori de parcare',
      'Teme și Interfețe'
    ];

    const sentences = [];
    let currentText = text;

    // First, split by known topic headers
    topicHeaders.forEach(header => {
      const regex = new RegExp(`(${header}[^.]*\\.)`, 'gi');
      currentText = currentText.replace(regex, '|SPLIT|$1|SPLIT|');
    });

    // Split by the markers we created
    let parts = currentText.split('|SPLIT|').filter(part => part.trim().length > 0);

    // Further split each part by sentence patterns
    parts.forEach(part => {
      // Split by period followed by capital letter
      let subParts = part.split(/\.\s+(?=[A-ZĂÂÎȘȚ])/);

      subParts.forEach(subPart => {
        let trimmed = subPart.trim();
        if (trimmed.length > 15) { // Minimum meaningful length
          // Clean up the sentence
          trimmed = trimmed
            .replace(/^(De asemenea,?\s*|În plus,?\s*|Totodată,?\s*)/i, '')
            .replace(/^\s*(Mai jos|Acest|Sistemul|Dispozitivul|Tableta|Produsul)\s+/i, '')
            .replace(/^Detalii\s+și\s+Ce\s+Conține\s+Pachetul\s*/i, '')
            .replace(/\bprezentarea\s+tabletei\s+PilotOn[^.]*\./gi, '')
            .replace(/\bîmpreună\s+cu\s+toate\s+accesoriile\s+incluse\s+în\s+pachet[^.]*\./gi, '')
            .trim();

          if (trimmed.length > 10) {
            sentences.push(trimmed.endsWith('.') ? trimmed : trimmed + '.');
          }
        }
      });
    });

    return sentences.filter(s => s.length > 15); // Filter out very short sentences
  }

  groupSentencesBySection(sentences) {
    const sections = {};

    // Initialize sections
    Object.keys(this.sectionPatterns).forEach(key => {
      sections[key] = {
        title: this.sectionPatterns[key].title,
        icon: this.sectionPatterns[key].icon,
        content: []
      };
    });

    // Analyze each sentence
    sentences.forEach(sentence => {
      const sectionKey = this.identifySection(sentence);
      if (sectionKey) {
        sections[sectionKey].content.push(sentence);
      } else {
        // If we can't identify the section, add to general features
        sections.advancedFeatures.content.push(sentence);
      }
    });

    // Remove empty sections
    Object.keys(sections).forEach(key => {
      if (sections[key].content.length === 0) {
        delete sections[key];
      }
    });

    return sections;
  }

  identifySection(sentence) {
    const lowerSentence = sentence.toLowerCase();
    let bestMatch = null;
    let maxMatches = 0;

    // Count keyword matches for each section
    Object.keys(this.sectionPatterns).forEach(sectionKey => {
      const keywords = this.sectionPatterns[sectionKey].keywords;
      let matches = 0;

      keywords.forEach(keyword => {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          matches++;
        }
      });

      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = sectionKey;
      }
    });

    return maxMatches > 0 ? bestMatch : null;
  }

  formatSections(sections) {
    const formatted = [];

    // Define preferred section order
    const sectionOrder = [
      'packageInstallation',
      'vehicleIntegration',
      'smartConnectivity',
      'displayHardware',
      'cameraSupport',
      'audioSound',
      'navigation',
      'advancedFeatures',
      'autoIntegration'
    ];

    sectionOrder.forEach(sectionKey => {
      if (sections[sectionKey] && sections[sectionKey].content.length > 0) {
        const section = sections[sectionKey];
        const sectionPattern = this.sectionPatterns[sectionKey];

        formatted.push({
          title: section.title,
          icon: section.icon,
          points: this.convertToPoints(section.content, sectionPattern)
        });
      }
    });

    return formatted;
  }

  convertToPoints(sentences, sectionPattern) {
    const points = [];

    // Handle special case for audio section with custom first point
    if (sectionPattern && sectionPattern.customFirstPoint) {
      points.push(sectionPattern.customFirstPoint);
    }

    const processedSentences = sentences.map(sentence => {
      // Remove redundant beginnings
      let point = sentence
        .replace(/^(De asemenea,?\s*|În plus,?\s*|Totodată,?\s*)/i, '')
        .replace(/^(Sistemul |Dispozitivul |Tableta |Produsul )/i, '')
        .replace(/^Detalii\s+și\s+Ce\s+Conține\s+Pachetul\s*/i, '')
        .replace(/\bUnboxing\s+Tableta[^.]*\./gi, '')
        .replace(/\bprezentarea\s+tabletei[^.]*\./gi, '')
        .replace(/\bîmpreună\s+cu\s+toate\s+accesoriile[^.]*\./gi, '')
        .trim();

      // Remove title patterns that should be extracted
      if (sectionPattern && sectionPattern.extractTitle) {
        point = point.replace(sectionPattern.extractTitle, '').trim();
      }

      // Skip empty or very short points
      if (point.length < 10) {
        return null;
      }

      // Ensure it starts with capital letter
      if (point.length > 0) {
        point = point.charAt(0).toUpperCase() + point.slice(1);
      }

      // Remove trailing period if present, we'll add bullet points
      point = point.replace(/\.$/, '');

      return point;
    }).filter(point => point !== null && point.length > 0);

    // Add processed sentences to points (skip first one for audio if custom first point exists)
    if (sectionPattern && sectionPattern.customFirstPoint) {
      // For audio section, skip the first processed sentence as it's likely the title we extracted
      points.push(...processedSentences.slice(1));
    } else {
      points.push(...processedSentences);
    }

    return points.filter(point => point && point.length > 0);
  }

  // Method to get a preview of sections for a description
  getPreview(description, maxSections = 3) {
    const parsed = this.parseDescription(description);
    return {
      sectionsCount: parsed.sections.length,
      preview: parsed.sections.slice(0, maxSections),
      hasMore: parsed.sections.length > maxSections
    };
  }
}

module.exports = DescriptionParser;