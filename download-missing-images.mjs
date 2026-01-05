import fs from 'fs';
import path from 'path';
import https from 'https';

const ROOT = process.cwd();
const missingListPath = path.join(ROOT, 'missing-images-clean.txt');
const xmlFeedPath = path.join(ROOT, '0dd00d87fcaef80b64aa73135f2c480c.xml');
const outputDir = path.join(ROOT, 'navishop/public/images/products');

const ensureDir = dir => fs.mkdirSync(dir, { recursive: true });

const downloadFile = (url, dest) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, response => {
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => reject(new Error(`Failed ${url} (${response.statusCode})`)));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', err => {
        file.close();
        fs.unlink(dest, () => reject(err));
      });
  });

const main = async () => {
  ensureDir(outputDir);

  const missing = fs
    .readFileSync(missingListPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

const xmlContent = fs.readFileSync(xmlFeedPath, 'utf8');
const imageMap = new Map();
const urlRegex = /https:\/\/[^\s<>"']+\/([A-Za-z0-9.~_-]+\.(?:jpg|png|jpeg))/gi;
let match;
while ((match = urlRegex.exec(xmlContent)) !== null) {
  const [url, filename] = match;
  if (!imageMap.has(filename)) {
    imageMap.set(filename, url);
  }
}

  let downloaded = 0;
  for (const filename of missing) {
    const url = imageMap.get(filename);
    if (!url) {
      console.warn(`No URL found for ${filename}`);
      continue;
    }
    const dest = path.join(outputDir, filename);
    if (fs.existsSync(dest)) {
      console.log(`Already exists: ${filename}`);
      continue;
    }
    try {
      console.log(`Downloading ${filename}`);
      await downloadFile(url, dest);
      downloaded += 1;
    } catch (err) {
      console.error(`Failed to download ${filename}: ${err.message}`);
    }
  }

  console.log(`Done. Downloaded ${downloaded} file(s).`);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
