const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number between 1 and 5'
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000
  },
  verified: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    type: Number,
    default: 0
  },
  votedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    helpful: {
      type: Boolean
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  flaggedReason: {
    type: String,
    trim: true
  },
  images: [{
    url: String,
    alt: String
  }]
}, {
  timestamps: true
});

// Compound index to prevent duplicate reviews from same user for same product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Index for admin queries
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Static method to get review statistics for a product
reviewSchema.statics.getProductReviewStats = async function(productId) {
  const stats = await this.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const result = stats[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  result.ratingDistribution.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });

  return {
    totalReviews: result.totalReviews,
    averageRating: Math.round(result.averageRating * 10) / 10,
    ratingDistribution: distribution
  };
};

// Method to check if user found review helpful
reviewSchema.methods.isHelpfulByUser = function(userId) {
  const vote = this.votedUsers.find(vote => vote.userId.toString() === userId.toString());
  return vote ? vote.helpful : null;
};

// Pre-save middleware to update product rating when review is approved/rejected
reviewSchema.pre('save', async function(next) {
  if (this.isModified('status')) {
    const Product = mongoose.model('Product');

    // If review is being approved or rejected, update product rating
    if (this.status === 'approved' || (this.status === 'rejected' && this.wasApproved)) {
      try {
        const product = await Product.findById(this.productId);
        if (product) {
          const stats = await this.constructor.getProductReviewStats(this.productId);
          product.averageRating = stats.averageRating;
          product.totalReviews = stats.totalReviews;
          await product.save();
        }
      } catch (error) {
        console.error('Error updating product rating:', error);
      }
    }
  }
  next();
});

// Post-remove middleware to update product rating when review is deleted
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.status === 'approved') {
    try {
      const Product = mongoose.model('Product');
      const product = await Product.findById(doc.productId);
      if (product) {
        const stats = await doc.constructor.getProductReviewStats(doc.productId);
        product.averageRating = stats.averageRating;
        product.totalReviews = stats.totalReviews;
        await product.save();
      }
    } catch (error) {
      console.error('Error updating product rating after review deletion:', error);
    }
  }
});

module.exports = mongoose.model('Review', reviewSchema);