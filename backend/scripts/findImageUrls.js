require('dotenv').config();
const fs = require('fs');
const path = require('path');
const FeedParser = require('../services/feedParser');

const getFilename = (url = '') => {
  if (!url) return '';
  const sanitized = url.split('?')[0].split('#')[0];
  return sanitized.substring(sanitized.lastIndexOf('/') + 1);
};

const loadRequestedFilenames = (filePath) => {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
};

const buildFeedMap = async () => {
  const parser = new FeedParser();
  const xml = await parser.fetchFeed();
  const feedData = await parser.parseFeed(xml);
  const entries = feedData.feed?.entry || [];
  const entryArray = Array.isArray(entries) ? entries : [entries];

  const urlMap = new Map();
  const registerUrl = (url) => {
    if (!url) return;
    const filename = getFilename(url);
    if (filename) {
      urlMap.set(filename, url);
    }
  };

  for (const entry of entryArray) {
    registerUrl(entry['g:image_link']);
    const additional = entry['g:additional_image_link'];
    if (additional) {
      const urls = Array.isArray(additional) ? additional : [additional];
      urls.forEach(registerUrl);
    }
  }

  return urlMap;
};

const run = async () => {
  const listFile = process.argv[2];
  if (!listFile) {
    console.error('Usage: node backend/scripts/findImageUrls.js <missing-files.txt>');
    process.exit(1);
  }

  const requested = loadRequestedFilenames(listFile);
  const feedMap = await buildFeedMap();

  requested.forEach(filename => {
    const url = feedMap.get(filename) || '';
    console.log(`${filename},${url}`);
  });
};

run().catch(error => {
  console.error('Failed to build image URL map:', error);
  process.exit(1);
});
