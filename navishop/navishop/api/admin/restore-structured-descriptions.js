import connectDB from '../../lib/mongodb';
import Product from '../../lib/models/Product';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Read the backup file with structured descriptions
    const backupPath = '/Users/alexmario/Desktop/site navigatii/piloton.products.json';

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found at ' + backupPath
      });
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`Loaded ${backupData.length} products from backup file`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const backupProduct of backupData) {
      // Skip if no structured description in backup
      if (!backupProduct.structuredDescription || !backupProduct.structuredDescription.sections) {
        continue;
      }

      // Find the corresponding product in current database by slug
      const currentProduct = await Product.findOne({ slug: backupProduct.slug });

      if (currentProduct) {
        // Clean the structured description (remove MongoDB _id fields)
        const cleanStructuredDescription = {
          sections: backupProduct.structuredDescription.sections.map(section => ({
            title: section.title,
            icon: section.icon,
            points: section.points
          }))
        };

        // Clean detailed specs (remove MongoDB _id fields)
        const cleanDetailedSpecs = backupProduct.detailedSpecs ? {
          ...backupProduct.detailedSpecs
        } : null;

        // Clean display specs (remove MongoDB _id fields)
        const cleanDisplaySpecs = backupProduct.displaySpecs ? {
          ...backupProduct.displaySpecs
        } : null;

        // Clean Romanian specs (remove MongoDB _id fields and nested objects)
        const cleanRomanianSpecs = backupProduct.romanianSpecs ? {
          hardware: backupProduct.romanianSpecs.hardware || {},
          display: backupProduct.romanianSpecs.display || {},
          connectivity: backupProduct.romanianSpecs.connectivity || {},
          features: backupProduct.romanianSpecs.features || {},
          package: backupProduct.romanianSpecs.package || {},
          compatibility: backupProduct.romanianSpecs.compatibility || {},
          general: backupProduct.romanianSpecs.general || {},
          additional: backupProduct.romanianSpecs.additional || {},
          rawDetails: backupProduct.romanianSpecs.rawDetails || {}
        } : null;

        // Prepare update object
        const updateData = {
          structuredDescription: cleanStructuredDescription
        };

        // Add detailed specs if available
        if (cleanDetailedSpecs) {
          updateData.detailedSpecs = cleanDetailedSpecs;
        }

        // Add display specs if available
        if (cleanDisplaySpecs) {
          updateData.displaySpecs = cleanDisplaySpecs;
        }

        // Add Romanian specs if available
        if (cleanRomanianSpecs) {
          updateData.romanianSpecs = cleanRomanianSpecs;
        }

        // Update with all the specification data
        await Product.findByIdAndUpdate(currentProduct._id, updateData);

        updatedCount++;
        console.log(`Updated: ${backupProduct.name} (structured descriptions + detailed specs)`);
      } else {
        notFoundCount++;
        console.log(`Not found in current DB: ${backupProduct.slug}`);
      }
    }

    // Count products with different types of specs
    const productsWithStructuredDescriptions = backupData.filter(p => p.structuredDescription?.sections?.length > 0).length;
    const productsWithDetailedSpecs = backupData.filter(p => p.detailedSpecs || p.displaySpecs || p.romanianSpecs).length;

    res.status(200).json({
      success: true,
      message: `Restoration complete - restored structured descriptions and detailed specifications`,
      backupProducts: backupData.length,
      productsWithStructuredDescriptions: productsWithStructuredDescriptions,
      productsWithDetailedSpecs: productsWithDetailedSpecs,
      updatedProducts: updatedCount,
      notFoundProducts: notFoundCount
    });

  } catch (error) {
    console.error('Error restoring structured descriptions and detailed specs:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring structured descriptions and detailed specifications',
      error: error.message
    });
  }
}