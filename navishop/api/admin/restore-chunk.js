import connectDB from '../../lib/mongodb';
import Product from '../../lib/models/Product';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Get chunk number from query parameter
    const chunkNumber = parseInt(req.query.chunk) || 1;
    const paddedChunkNumber = String(chunkNumber).padStart(3, '0');

    // Read the specific chunk file
    const chunkPath = path.join(process.cwd(), 'data', 'chunks', `chunk-${paddedChunkNumber}.json`);

    if (!fs.existsSync(chunkPath)) {
      return res.status(404).json({
        success: false,
        message: `Chunk file not found: chunk-${paddedChunkNumber}.json`
      });
    }

    const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
    console.log(`Processing chunk ${chunkNumber} with ${chunkData.length} products`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;

    for (const backupProduct of chunkData) {
      // Skip if no structured description in backup
      if (!backupProduct.structuredDescription || !backupProduct.structuredDescription.sections) {
        skippedCount++;
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

    res.status(200).json({
      success: true,
      message: `Chunk ${chunkNumber} processed successfully`,
      chunkNumber: chunkNumber,
      chunkProducts: chunkData.length,
      updatedProducts: updatedCount,
      notFoundProducts: notFoundCount,
      skippedProducts: skippedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error processing chunk:`, error);
    res.status(500).json({
      success: false,
      message: 'Error processing chunk',
      error: error.message,
      chunkNumber: req.query.chunk
    });
  }
}