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
const paymentRoutes = require('./routes/payments');
const shippingRoutes = require('./routes/shipping');
const testShippingRoutes = require('./routes/test-shipping');
const testFanCourierRoutes = require('./routes/test-fan-courier-integration');
const uploadRoutes = require('./routes/upload');
const dashboardRoutes = require('./routes/dashboard');
const reviewRoutes = require('./routes/reviews');
const b2bApplicationRoutes = require('./routes/b2bApplications');
const contactMessageRoutes = require('./routes/contactMessages');
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001'
];

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
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
const imageCache = { maxAge: '7d' };
app.use('/images', express.static(path.join(__dirname, '../navishop/public/images'), imageCache));
app.use('/cars', express.static(path.join(__dirname, '../navishop/public/cars'), { maxAge: '30d' }));
app.use('/test-slider', express.static(path.join(__dirname, '../navishop/public/test slider'), imageCache));
app.use('/test-slider-on', express.static(path.join(__dirname, '../navishop/public/test slider ON'), imageCache));

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/guest-orders', guestOrderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/test', testShippingRoutes);
app.use('/api/fan-courier-test', testFanCourierRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/b2b-applications', b2bApplicationRoutes);
app.use('/api/contact-messages', contactMessageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'PilotOn API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
