const https = require('https');

const BASE_URL = 'https://navishop-181zzfve4-alexs-projects-65522e6f.vercel.app';
const TOTAL_CHUNKS = 110;

async function makeRequest(chunkNumber) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/admin/restore-chunk?chunk=${chunkNumber}`;
    console.log(`Processing chunk ${chunkNumber}...`);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ Chunk ${chunkNumber}: Updated ${result.updatedProducts}/${result.chunkProducts} products`);
          resolve(result);
        } catch (error) {
          console.error(`❌ Chunk ${chunkNumber}: Parse error`, error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Chunk ${chunkNumber}: Request error`, error.message);
      reject(error);
    });

    req.end();
  });
}

async function processAllChunks() {
  console.log(`🚀 Starting restoration of all ${TOTAL_CHUNKS} chunks...`);

  let totalUpdated = 0;
  let totalProcessed = 0;
  let errors = 0;

  for (let i = 1; i <= TOTAL_CHUNKS; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

      const result = await makeRequest(i);
      totalUpdated += result.updatedProducts;
      totalProcessed += result.chunkProducts;

    } catch (error) {
      errors++;
      console.error(`Failed to process chunk ${i}:`, error.message);
    }
  }

  console.log(`\n📊 Final Results:`);
  console.log(`  - Total chunks processed: ${TOTAL_CHUNKS}`);
  console.log(`  - Total products processed: ${totalProcessed}`);
  console.log(`  - Total products updated: ${totalUpdated}`);
  console.log(`  - Errors: ${errors}`);
  console.log(`\n✅ All chunks restoration completed!`);
}

processAllChunks().catch(console.error);