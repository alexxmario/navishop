const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const router = express.Router();

const parseAllowedOrigins = () => {
  return (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

const getPublicBaseUrl = (req) => {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  return `${protocol}://${host}`;
};

router.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../navishop/public/images/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload single image
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Verify file was actually written to disk
    const filePath = path.join(uploadDir, req.file.filename);
    if (!fs.existsSync(filePath)) {
      console.error(`Upload verification failed: File not found at ${filePath}`);
      return res.status(500).json({
        message: 'Upload failed - file not saved to disk',
        error: 'FILE_NOT_WRITTEN'
      });
    }

    // Verify file size matches
    const stats = fs.statSync(filePath);
    if (stats.size !== req.file.size) {
      console.error(`Upload verification failed: Size mismatch. Expected ${req.file.size}, got ${stats.size}`);
      // Delete corrupted file
      fs.unlinkSync(filePath);
      return res.status(500).json({
        message: 'Upload failed - file corrupted during transfer',
        error: 'SIZE_MISMATCH'
      });
    }

    const relativeUrl = `/images/products/${req.file.filename}`;
    const absoluteUrl = `${getPublicBaseUrl(req)}${relativeUrl}`;

    console.log(`Image uploaded successfully: ${req.file.filename} (${stats.size} bytes)`);

    res.json({
      url: absoluteUrl,
      relativeUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      verified: true
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

// Upload multiple images
router.post('/images', auth, upload.array('images', 30), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const uploadedImages = req.files.map(file => ({
      url: `${getPublicBaseUrl(req)}/images/products/${file.filename}`,
      relativeUrl: `/images/products/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));
    
    res.json({
      images: uploadedImages,
      count: uploadedImages.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading images', error: error.message });
  }
});

// Delete image
router.delete('/image/:filename', auth, async (req, res) => {
  try {
    const filename = req.params.filename;
    // path.basename keeps a crafted filename from walking out of the upload dir
    const safeName = path.basename(filename);
    const filePath = path.join(uploadDir, safeName);

    // Check if file exists locally
    if (!fs.existsSync(filePath)) {
      // File doesn't exist locally - it might be an external CDN image
      // Return success so the image reference can still be removed from the product
      return res.json({ message: 'Image reference removed', external: true });
    }

    // Image files are shared between products: "copy images from another product"
    // in the admin panel, and the bulk scripts, point many products at the same
    // file — 6.000+ of them do. Unlinking it because one product dropped the
    // reference would blank the image everywhere else it is used, so the file only
    // goes when nothing points at it any more.
    const pattern = new RegExp(`/${safeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    const stillUsed = await Product.countDocuments({ 'images.url': pattern });
    if (stillUsed > 0) {
      return res.json({
        message: 'Image reference removed',
        kept: true,
        usedBy: stillUsed
      });
    }

    // Delete the local file
    fs.unlinkSync(filePath);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

module.exports = router;
