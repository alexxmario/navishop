const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Only allow admin users to access user list
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const {
      page = 1,
      limit = 25,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      googleId,
      facebookId
    } = req.query;

    const query = {};
    
    // Add filters
    if (role) query.role = role;
    
    // OAuth filters
    if (googleId) {
      if (googleId === '{"$exists":true}') {
        query.googleId = { $exists: true };
      } else if (googleId === '{"$exists":false}') {
        query.googleId = { $exists: false };
      }
    }
    
    if (facebookId) {
      if (facebookId === '{"$exists":true}') {
        query.facebookId = { $exists: true };
      } else if (facebookId === '{"$exists":false}') {
        query.facebookId = { $exists: false };
      }
    }
    
    // Search in name and email
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .select('-password') // Exclude password from response
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      data: users,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Error fetching users', 
      error: error.message 
    });
  }
});

// Get single user by ID (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    // Only allow admin users to access user details
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      message: 'Error fetching user', 
      error: error.message 
    });
  }
});

// Update user (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Only allow admin users to update user details
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { password, ...updateData } = req.body;
    
    // Don't allow password updates through this endpoint for security
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      message: 'Error updating user', 
      error: error.message 
    });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only allow admin users to delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Don't allow admin to delete themselves
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    const user = await User.findByIdAndDelete(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', user });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      message: 'Error deleting user', 
      error: error.message 
    });
  }
});

module.exports = router;