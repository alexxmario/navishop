const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  image: {
    type: String
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    county: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: 'România',
      trim: true
    }
  },
  billingAddress: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    county: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      default: 'România',
      trim: true
    },
    sameAsShipping: {
      type: Boolean,
      default: true
    }
  },
  orderTotal: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'bank_transfer', 'card', 'smartbill_online', 'smartbill_transfer'],
    default: 'cash_on_delivery'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  trackingCode: {
    type: String,
    unique: true,
    sparse: true
  },
  shipping: {
    provider: {
      type: String,
      enum: ['fan_courier', 'other'],
      default: 'fan_courier'
    },
    awbNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    cost: {
      type: Number,
      default: 0
    },
    pdfLink: {
      type: String
    },
    estimatedDelivery: {
      type: Date
    },
    actualDelivery: {
      type: Date
    }
  },
  invoice: {
    invoiceId: {
      type: String
    },
    invoiceNumber: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  paymentId: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Generate tracking code for shipped orders
orderSchema.pre('save', function(next) {
  if (this.status === 'shipped' && !this.trackingCode) {
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    this.trackingCode = `TRK${random}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);