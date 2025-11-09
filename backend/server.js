require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const productRoutes = require('./routes/products');
const guestOrderRoutes = require('./routes/guestOrders');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const syncRoutes = require('./routes/sync');
const brandsRoutes = require('./routes/brands');
const webhookRoutes = require('./routes/webhooks');
const shippingRoutes = require('./routes/shipping');
let testShippingRoutes = null;
try {
  testShippingRoutes = require('./routes/test-shipping');
} catch (error) {
  console.warn('Optional test shipping routes could not be loaded:', error.message);
}
let testFanCourierRoutes = null;
try {
  testFanCourierRoutes = require('./routes/test-fan-courier-integration');
} catch (error) {
  console.warn('Optional test fan courier routes could not be loaded:', error.message);
}
const uploadRoutes = require('./routes/upload');
const dashboardRoutes = require('./routes/dashboard');
const reviewRoutes = require('./routes/reviews');
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

const ensureAdminUser = require('./services/ensureAdminUser');

connectDB()
  .then(() => ensureAdminUser())
  .catch(error => {
    console.error('Failed to initialize admin user:', error);
  });

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://navishop.vercel.app',
    'https://navishop-luzogoady-alexs-projects-65522e6f.vercel.app',
    /^https:\/\/navishop-.*-alexs-projects-65522e6f\.vercel\.app$/,
    'https://admin-panel-navishop.vercel.app',
    /^https:\/\/admin-panel-navishop-.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// Set proper UTF-8 encoding for all responses
app.use((req, res, next) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static images from frontend public directory
const localImagesDir = path.join(__dirname, '../navishop/public/images');
const uploadsOverrideDir = process.env.UPLOAD_DIR || path.join('/tmp', 'navishop', 'uploads', 'products');

app.use('/images', express.static(localImagesDir));
if (uploadsOverrideDir && uploadsOverrideDir !== localImagesDir) {
  app.use('/images/products', express.static(uploadsOverrideDir));
}
app.use('/test-slider', express.static(path.join(__dirname, '../navishop/public/test slider')));
app.use('/test-slider-on', express.static(path.join(__dirname, '../navishop/public/test slider ON')));

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/guest-orders', guestOrderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/shipping', shippingRoutes);
if (testShippingRoutes) {
  app.use('/api/test', testShippingRoutes);
}
if (testFanCourierRoutes) {
  app.use('/api/fan-courier-test', testFanCourierRoutes);
}
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'PilotOn API is running!' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless deployment
module.exports = app;
