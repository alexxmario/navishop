const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const specificationSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const compatibilitySchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  models: [{
    type: String,
    trim: true
  }],
  yearFrom: {
    type: Number
  },
  yearTo: {
    type: Number
  },
  years: [{
    type: Number
  }]
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 300
  },
  category: {
    type: String,
    required: true,
    enum: [
      'navigatii-gps',
      'carplay-android',
      'camere-marsarier',
      'sisteme-multimedia',
      'dvr',
      'accesorii'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: [specificationSchema],
  compatibility: [compatibilitySchema],
  features: [{
    type: String,
    trim: true
  }],
  inTheBox: [{
    type: String,
    trim: true
  }],
  // Enhanced detailed specifications
  detailedSpecs: {
    processor: {
      type: String,
      trim: true
    },
    ram: {
      type: String,
      trim: true
    },
    storage: {
      type: String,
      trim: true
    }
  },
  displaySpecs: {
    screenSize: {
      type: String,
      trim: true
    },
    technology: {
      type: String,
      trim: true,
      enum: ['INCELL', 'QLED', 'LCD', 'OLED', '']
    },
    resolution: {
      type: String,
      trim: true
    }
  },
  technicalFeatures: [{
    type: String,
    trim: true
  }],
  connectivityOptions: [{
    type: String,
    trim: true
  }],
  // Romanian detailed specifications from website
  romanianSpecs: {
    hardware: {
      memorieRAM: {
        type: String,
        trim: true
      },
      capacitateStocare: {
        type: String,
        trim: true
      },
      modelProcesor: {
        type: String,
        trim: true
      }
    },
    display: {
      diagonalaDisplay: {
        type: String,
        trim: true
      },
      rezolutieDisplay: {
        type: String,
        trim: true
      },
      tehnologieDisplay: {
        type: String,
        trim: true
      }
    },
    connectivity: {
      conectivitate: {
        type: String,
        trim: true
      },
      bluetooth: {
        type: String,
        trim: true
      },
      wifi: {
        type: String,
        trim: true
      }
    },
    features: {
      functii: {
        type: String,
        trim: true
      },
      splitScreen: {
        type: String,
        trim: true
      },
      suportAplicatiiAndroid: {
        type: String,
        trim: true
      },
      limbiInterfata: {
        type: String,
        trim: true
      },
      preluareComenziVolan: {
        type: String,
        trim: true
      }
    },
    package: {
      continutPachet: {
        type: String,
        trim: true
      },
      formateMediaSuportate: {
        type: String,
        trim: true
      }
    },
    compatibility: {
      destinatPentru: {
        type: String,
        trim: true
      },
      marca: {
        type: String,
        trim: true
      },
      tipMontare: {
        type: String,
        trim: true
      }
    },
    general: {
      sku: {
        type: String,
        trim: true
      },
      categorii: {
        type: String,
        trim: true
      },
      brand: {
        type: String,
        trim: true
      },
      sistemOperare: {
        type: String,
        trim: true
      },
      harta: {
        type: String,
        trim: true
      },
      tmc: {
        type: String,
        trim: true
      }
    },
    additional: {
      limitari: {
        type: String,
        trim: true
      },
      garantie: {
        type: String,
        trim: true
      },
      observatii: {
        type: String,
        trim: true
      },
      note: {
        type: String,
        trim: true
      },
      mentiuni: {
        type: String,
        trim: true
      }
    },
    rawDetails: {
      type: mongoose.Schema.Types.Mixed
    },
    scrapedAt: {
      type: Date
    }
  },
  // Structured description with organized sections
  structuredDescription: {
    sections: [{
      title: {
        type: String,
        trim: true
      },
      icon: {
        type: String,
        trim: true
      },
      points: [{
        type: String,
        trim: true
      }]
    }],
    originalDescription: {
      type: String,
      trim: true
    },
    parsedAt: {
      type: Date,
      default: Date.now
    }
  },
  weight: {
    type: Number
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  warranty: {
    type: Number,
    default: 12
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  featured: {
    type: Boolean,
    default: false
  },
  newProduct: {
    type: Boolean,
    default: false
  },
  onSale: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  seoTitle: {
    type: String,
    trim: true
  },
  seoDescription: {
    type: String,
    trim: true
  },
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  // Cross-sell products (compatible accessories)
  crossSellProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ status: 1 });
productSchema.index({ crossSellProducts: 1 });

productSchema.methods.updateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.averageRating = 0;
    this.totalReviews = 0;
    return;
  }
  
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  this.averageRating = parseFloat((sum / this.reviews.length).toFixed(1));
  this.totalReviews = this.reviews.length;
};

productSchema.methods.isInStock = function() {
  return this.stock > 0;
};

productSchema.methods.isLowStock = function() {
  return this.stock <= this.lowStockThreshold && this.stock > 0;
};

productSchema.methods.getDiscountedPrice = function() {
  if (this.discount > 0 && this.originalPrice) {
    return this.originalPrice * (1 - this.discount / 100);
  }
  return this.price;
};

productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  if (this.discount > 0 && !this.originalPrice) {
    this.originalPrice = this.price;
    this.price = this.getDiscountedPrice();
  }
  
  this.onSale = this.discount > 0;
  
  next();
});

productSchema.pre('save', function(next) {
  if (this.isModified('reviews')) {
    this.updateAverageRating();
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);