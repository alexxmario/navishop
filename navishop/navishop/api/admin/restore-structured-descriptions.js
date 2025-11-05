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

        // Update with the structured description
        await Product.findByIdAndUpdate(currentProduct._id, {
          structuredDescription: cleanStructuredDescription
        });

        updatedCount++;
        console.log(`Updated: ${backupProduct.name}`);
      } else {
        notFoundCount++;
        console.log(`Not found in current DB: ${backupProduct.slug}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Restoration complete`,
      backupProducts: backupData.length,
      productsWithStructuredDescriptions: backupData.filter(p => p.structuredDescription?.sections?.length > 0).length,
      updatedProducts: updatedCount,
      notFoundProducts: notFoundCount
    });

  } catch (error) {
    console.error('Error restoring structured descriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring structured descriptions',
      error: error.message
    });
  }
}