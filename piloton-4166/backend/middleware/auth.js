const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Auth middleware - token received:', !!token);
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - decoded token:', decoded);
    
    const user = await User.findById(decoded.userId);
    console.log('Auth middleware - user found:', !!user);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    req.userId = decoded.userId;
    console.log('Auth middleware - setting req.userId:', decoded.userId);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }
    
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;