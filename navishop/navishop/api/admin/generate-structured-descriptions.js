import connectDB from '../../lib/mongodb';
import Product from '../../lib/models/Product';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Get all products that don't have structured descriptions
    const products = await Product.find({
      $or: [
        { 'structuredDescription.sections': { $exists: false } },
        { 'structuredDescription.sections': { $size: 0 } }
      ]
    }).limit(100); // Process in batches

    console.log(`Found ${products.length} products without structured descriptions`);

    let updatedCount = 0;

    for (const product of products) {
      const structuredDescription = generateStructuredDescription(product.description);

      if (structuredDescription && structuredDescription.sections.length > 0) {
        await Product.findByIdAndUpdate(product._id, {
          structuredDescription: structuredDescription
        });
        updatedCount++;
        console.log(`Updated product: ${product.name}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated ${updatedCount} products with structured descriptions`,
      processedProducts: products.length,
      updatedProducts: updatedCount
    });

  } catch (error) {
    console.error('Error generating structured descriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating structured descriptions',
      error: error.message
    });
  }
}

function generateStructuredDescription(description) {
  if (!description) return null;

  const sections = [];

  // Map of section patterns and their corresponding icons and titles
  const sectionPatterns = [
    {
      pattern: /(unboxing|pachet|continut|accesor)/i,
      title: "Unboxing & Conținut Pachet",
      icon: "📦"
    },
    {
      pattern: /(montaj|instalare|plug.*play|install)/i,
      title: "Montaj Ușor",
      icon: "🔧"
    },
    {
      pattern: /(control.*volan|comand.*volan|volan)/i,
      title: "Control de pe Volan",
      icon: "🎛️"
    },
    {
      pattern: /(carplay|android.*auto|wireless)/i,
      title: "CarPlay & Android Auto",
      icon: "📱"
    },
    {
      pattern: /(camera|dvr|marsarier|parcare)/i,
      title: "Camere & DVR",
      icon: "📹"
    },
    {
      pattern: /(procesor|core|ram|stocare|memorie)/i,
      title: "Performanță Hardware",
      icon: "⚡"
    },
    {
      pattern: /(display|ecran|incell|resolution|touch)/i,
      title: "Display Premium",
      icon: "🖥️"
    },
    {
      pattern: /(audio|sound|dsp|equalizer|egalizator)/i,
      title: "Sistem Audio",
      icon: "🔊"
    },
    {
      pattern: /(wifi|4g|lte|hotspot|internet|conectivitate)/i,
      title: "Conectivitate",
      icon: "📶"
    },
    {
      pattern: /(bluetooth|hands.*free|apel|telefon)/i,
      title: "Bluetooth & Apeluri",
      icon: "🔵"
    },
    {
      pattern: /(navigat|gps|maps|waze|harta)/i,
      title: "Navigație GPS",
      icon: "🗺️"
    },
    {
      pattern: /(radio|fm|am|rds|online)/i,
      title: "Radio & Media",
      icon: "📻"
    },
    {
      pattern: /(split.*screen|multitask|ecran.*impartit)/i,
      title: "Multitasking",
      icon: "📊"
    },
    {
      pattern: /(senzorii|climat|incalzire|scaune)/i,
      title: "Integrare Vehicul",
      icon: "🚗"
    },
    {
      pattern: /(interfat|tema|personalizare|custom)/i,
      title: "Personalizare",
      icon: "🎨"
    }
  ];

  // Split description into sentences
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 20);

  // Group sentences by sections
  const sectionMap = new Map();

  for (const sentence of sentences) {
    let matched = false;

    for (const pattern of sectionPatterns) {
      if (pattern.pattern.test(sentence)) {
        if (!sectionMap.has(pattern.title)) {
          sectionMap.set(pattern.title, {
            title: pattern.title,
            icon: pattern.icon,
            points: []
          });
        }
        sectionMap.get(pattern.title).points.push(sentence.trim());
        matched = true;
        break;
      }
    }

    // If no specific pattern matches, add to general section
    if (!matched && sentence.trim().length > 30) {
      if (!sectionMap.has("Caracteristici Generale")) {
        sectionMap.set("Caracteristici Generale", {
          title: "Caracteristici Generale",
          icon: "⭐",
          points: []
        });
      }
      sectionMap.get("Caracteristici Generale").points.push(sentence.trim());
    }
  }

  // Convert map to array and filter out sections with too few points
  const validSections = Array.from(sectionMap.values()).filter(section =>
    section.points.length > 0 && section.points.some(point => point.length > 15)
  );

  // Limit points per section to avoid overwhelming
  validSections.forEach(section => {
    if (section.points.length > 4) {
      section.points = section.points.slice(0, 4);
    }
  });

  return {
    sections: validSections
  };
}