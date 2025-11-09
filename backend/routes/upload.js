const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const router = express.Router();

const localUploadsDir = path.join(__dirname, '../../navishop/public/images/products');
const fallbackUploadsDir = process.env.UPLOAD_DIR || path.join('/tmp', 'navishop', 'uploads', 'products');

const ensureDirectory = (dir) => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (error) {
    console.warn(`Unable to initialize upload directory at ${dir}: ${error.message}`);
    return false;
  }
};

let uploadDir = localUploadsDir;
if (!ensureDirectory(uploadDir)) {
  uploadDir = fallbackUploadsDir;
  if (!ensureDirectory(uploadDir)) {
    throw new Error('Failed to initialize any upload directory');
  }
}

console.log(`Product images will be stored in: ${uploadDir}`);

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
router.post('/image', auth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `/images/products/${req.file.filename}`;
    
    res.json({
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

// Upload multiple images
router.post('/images', auth, upload.array('images', 20), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const uploadedImages = req.files.map(file => ({
      url: `/images/products/${file.filename}`,
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
router.delete('/image/:filename', auth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting image', error: error.message });
  }
});

module.exports = router;
