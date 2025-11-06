const fs = require('fs');
const path = require('path');

// Read the large backup file
const backupPath = path.join(__dirname, '..', 'data', 'piloton.products.json');
const outputDir = path.join(__dirname, '..', 'data', 'chunks');

console.log('Reading backup file...');
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
console.log(`Loaded ${backupData.length} products from backup file`);

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create just one small test chunk with the first 3 products
const testChunk = backupData.slice(0, 3);
const chunkPath = path.join(outputDir, 'chunk-001.json');

fs.writeFileSync(chunkPath, JSON.stringify(testChunk, null, 2));
console.log(`Created test chunk-001.json with ${testChunk.length} products for testing`);

// Display the first product's structure for verification
if (testChunk.length > 0) {
  const firstProduct = testChunk[0];
  console.log(`\\nFirst product structure:`);
  console.log(`- Name: ${firstProduct.name}`);
  console.log(`- Slug: ${firstProduct.slug}`);
  console.log(`- Has structuredDescription: ${!!firstProduct.structuredDescription}`);
  console.log(`- Has detailedSpecs: ${!!firstProduct.detailedSpecs}`);
  console.log(`- Has displaySpecs: ${!!firstProduct.displaySpecs}`);
  console.log(`- Has romanianSpecs: ${!!firstProduct.romanianSpecs}`);

  if (firstProduct.structuredDescription && firstProduct.structuredDescription.sections) {
    console.log(`- Structured description sections: ${firstProduct.structuredDescription.sections.length}`);
  }
}