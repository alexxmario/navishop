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
const testShippingRoutes = require('./routes/test-shipping');
const testFanCourierRoutes = require('./routes/test-fan-courier-integration');
const uploadRoutes = require('./routes/upload');
const dashboardRoutes = require('./routes/dashboard');
const reviewRoutes = require('./routes/reviews');
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://navishop.vercel.app',
    'https://navishop-luzogoady-alexs-projects-65522e6f.vercel.app',
    /^https:\/\/navishop-.*-alexs-projects-65522e6f\.vercel\.app$/
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
app.use('/images', express.static(path.join(__dirname, '../navishop/public/images')));
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
app.use('/api/test', testShippingRoutes);
app.use('/api/fan-courier-test', testFanCourierRoutes);
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