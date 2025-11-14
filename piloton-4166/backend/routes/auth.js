const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide name, email, and password' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect('http://localhost:3000/login?error=google_not_configured');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect('http://localhost:3000/login?error=google_not_configured');
  }
  
  passport.authenticate('google', { 
    failureRedirect: 'http://localhost:3000/login?error=auth_failed' 
  })(req, res, next);
}, async (req, res) => {
  try {
    console.log('Google OAuth callback - req.user:', req.user);
    console.log('Google OAuth callback - req.user._id:', req.user._id);
    console.log('Google OAuth callback - req.user.id:', req.user.id);
    
    const token = jwt.sign(
      { userId: req.user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log('Generated JWT token for Google user');
    
    // Redirect to frontend home page with token
    res.redirect(`http://localhost:3000/?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect('http://localhost:3000/login?error=auth_failed');
  }
});

// Facebook OAuth routes
router.get('/facebook', (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.redirect('http://localhost:3000/login?error=facebook_not_configured');
  }
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});

router.get('/facebook/callback', (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.redirect('http://localhost:3000/login?error=facebook_not_configured');
  }
  
  passport.authenticate('facebook', { 
    failureRedirect: 'http://localhost:3000/login?error=auth_failed' 
  })(req, res, next);
}, async (req, res) => {
  try {
    console.log('Facebook OAuth callback - req.user:', req.user);
    console.log('Facebook OAuth callback - req.user._id:', req.user._id);
    console.log('Facebook OAuth callback - req.user.id:', req.user.id);
    
    const token = jwt.sign(
      { userId: req.user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log('Generated JWT token for Facebook user');
    
    // Redirect to frontend home page with token
    res.redirect(`http://localhost:3000/?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
  } catch (error) {
    console.error('Facebook callback error:', error);
    res.redirect('http://localhost:3000/login?error=auth_failed');
  }
});

module.exports = router;