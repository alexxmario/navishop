const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews/product/:productId - Get all approved reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    let sortOption = { createdAt: -1 }; // Default: newest first

    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpfulVotes: -1, createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    const [reviews, totalReviews, stats] = await Promise.all([
      Review.find({
        productId: new mongoose.Types.ObjectId(productId),
        status: 'approved'
      })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name avatar')
      .lean(),

      Review.countDocuments({
        productId: new mongoose.Types.ObjectId(productId),
        status: 'approved'
      }),

      Review.getProductReviewStats(productId)
    ]);

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// GET /api/reviews/stats/:productId - Get review statistics for a product
router.get('/stats/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const stats = await Review.getProductReviewStats(productId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ message: 'Server error fetching review statistics' });
  }
});

// POST /api/reviews - Create a new review (authenticated users only)
router.post('/', auth, async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.userId;

    // Validation
    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({
        message: 'Product ID, rating, title, and comment are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        message: 'Rating must be a whole number between 1 and 5'
      });
    }

    if (comment.length < 10 || comment.length > 1000) {
      return res.status(400).json({
        message: 'Comment must be between 10 and 1000 characters'
      });
    }

    if (title.length > 100) {
      return res.status(400).json({
        message: 'Title must be 100 characters or less'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({
        message: 'You have already reviewed this product'
      });
    }

    // Create review
    const review = new Review({
      productId,
      userId,
      userName: user.name,
      userEmail: user.email,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      status: 'pending' // Reviews need approval
    });

    await review.save();

    // Populate user data for response
    await review.populate('userId', 'name avatar');

    res.status(201).json({
      message: 'Review submitted successfully. It will be published after approval.',
      review: review
    });
  } catch (error) {
    console.error('Error creating review:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'You have already reviewed this product'
      });
    }

    res.status(500).json({ message: 'Server error creating review' });
  }
});

// PUT /api/reviews/:reviewId - Update a review (by original author)
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Only allow author to edit their own review
    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this review' });
    }

    // Validate new data if provided
    if (rating !== undefined) {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({
          message: 'Rating must be a whole number between 1 and 5'
        });
      }
      review.rating = rating;
    }

    if (title !== undefined) {
      if (title.length > 100) {
        return res.status(400).json({
          message: 'Title must be 100 characters or less'
        });
      }
      review.title = title.trim();
    }

    if (comment !== undefined) {
      if (comment.length < 10 || comment.length > 1000) {
        return res.status(400).json({
          message: 'Comment must be between 10 and 1000 characters'
        });
      }
      review.comment = comment.trim();
    }

    // Reset to pending if review was previously approved and content changed
    if (rating !== undefined || title !== undefined || comment !== undefined) {
      if (review.status === 'approved') {
        review.status = 'pending';
      }
    }

    await review.save();
    await review.populate('userId', 'name avatar');

    res.json({
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Server error updating review' });
  }
});

// DELETE /api/reviews/:reviewId - Delete a review (by author or admin)
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const user = await User.findById(userId);

    // Allow deletion by review author or admin
    if (review.userId.toString() !== userId.toString() && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error deleting review' });
  }
});

// POST /api/reviews/:reviewId/helpful - Mark review as helpful/unhelpful
router.post('/:reviewId/helpful', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { helpful } = req.body; // true for helpful, false for not helpful
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ message: 'Helpful field must be true or false' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Remove existing vote from this user
    review.votedUsers = review.votedUsers.filter(
      vote => vote.userId.toString() !== userId.toString()
    );

    // Add new vote
    review.votedUsers.push({ userId, helpful });

    // Recalculate helpful votes
    review.helpfulVotes = review.votedUsers.filter(vote => vote.helpful).length;

    await review.save();

    res.json({
      message: helpful ? 'Marked as helpful' : 'Marked as not helpful',
      helpfulVotes: review.helpfulVotes,
      userVote: helpful
    });
  } catch (error) {
    console.error('Error voting on review:', error);
    res.status(500).json({ message: 'Server error processing vote' });
  }
});

// GET /api/reviews/user/my-reviews - Get current user's reviews
router.get('/user/my-reviews', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const [reviews, totalReviews] = await Promise.all([
      Review.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('productId', 'name slug images')
        .lean(),

      Review.countDocuments({ userId })
    ]);

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Server error fetching your reviews' });
  }
});

// ADMIN ROUTES

// GET /api/reviews/admin/all - Get all reviews for admin (with filtering)
router.get('/admin/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 20,
      status = 'all',
      productId,
      rating,
      search
    } = req.query;

    let query = {};

    if (status !== 'all') {
      query.status = status;
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      query.productId = new mongoose.Types.ObjectId(productId);
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [reviews, totalReviews] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('productId', 'name slug')
        .populate('userId', 'name email')
        .lean(),

      Review.countDocuments(query)
    ]);

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// PUT /api/reviews/admin/:reviewId/status - Update review status (admin only)
router.put('/admin/:reviewId/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { reviewId } = req.params;
    const { status, adminNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const oldStatus = review.status;
    review.status = status;

    if (adminNotes) {
      review.adminNotes = adminNotes.trim();
    }

    // Track if review was previously approved (for middleware)
    if (oldStatus === 'approved' && status !== 'approved') {
      review.wasApproved = true;
    }

    await review.save();

    await review.populate([
      { path: 'productId', select: 'name slug' },
      { path: 'userId', select: 'name email' }
    ]);

    res.json({
      message: `Review ${status} successfully`,
      review
    });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ message: 'Server error updating review status' });
  }
});

// GET /api/reviews/admin/stats - Get admin review statistics
router.get('/admin/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [statusStats, ratingStats, recentReviews] = await Promise.all([
      Review.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      Review.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        }
      ]),

      Review.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('productId', 'name slug')
        .populate('userId', 'name')
        .lean()
    ]);

    const stats = {
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, { pending: 0, approved: 0, rejected: 0 }),

      byRating: ratingStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),

      recentPendingReviews: recentReviews
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin review stats:', error);
    res.status(500).json({ message: 'Server error fetching review statistics' });
  }
});

module.exports = router;