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

// Split into chunks of 20 products each
const chunkSize = 20;
const totalChunks = Math.ceil(backupData.length / chunkSize);

console.log(`Splitting into ${totalChunks} chunks of ${chunkSize} products each...`);

for (let i = 0; i < totalChunks; i++) {
  const startIndex = i * chunkSize;
  const endIndex = Math.min(startIndex + chunkSize, backupData.length);
  const chunk = backupData.slice(startIndex, endIndex);

  const chunkFilename = `chunk-${String(i + 1).padStart(3, '0')}.json`;
  const chunkPath = path.join(outputDir, chunkFilename);

  fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
  console.log(`Created ${chunkFilename} with ${chunk.length} products (${startIndex}-${endIndex - 1})`);
}

console.log(`\nCompleted! Created ${totalChunks} chunk files in ${outputDir}`);
console.log('Each chunk contains up to 20 products and should process quickly in serverless environment.');