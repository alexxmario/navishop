const mongoose = require('mongoose');

const b2bApplicationSchema = new mongoose.Schema({
  // Contact Information
  contactName: {
    type: String,
    required: [true, 'Numele persoanei de contact este obligatoriu'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email-ul este obligatoriu'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Telefonul este obligatoriu'],
    trim: true
  },

  // Company Information
  companyName: {
    type: String,
    required: [true, 'Denumirea companiei este obligatorie'],
    trim: true
  },
  vatNumber: {
    type: String,
    required: [true, 'CUI/CIF este obligatoriu'],
    trim: true
  },
  companyAddress: {
    street: {
      type: String,
      required: [true, 'Adresa este obligatorie']
    },
    city: {
      type: String,
      required: [true, 'Orașul este obligatoriu']
    },
    county: {
      type: String,
      required: [true, 'Județul este obligatoriu']
    },
    postalCode: {
      type: String,
      required: [true, 'Codul poștal este obligatoriu']
    }
  },

  // Application Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    trim: true
  },

  // Link to created user (after approval)
  createdUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Generated password (stored temporarily for admin to share)
  temporaryPassword: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for quick lookup
b2bApplicationSchema.index({ email: 1 });
b2bApplicationSchema.index({ status: 1 });
b2bApplicationSchema.index({ vatNumber: 1 });

module.exports = mongoose.model('B2BApplication', b2bApplicationSchema);
