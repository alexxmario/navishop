const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Numele este obligatoriu'],
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
    trim: true
  },

  // Optional vehicle details supplied in the contact form
  carBrand: {
    type: String,
    trim: true
  },
  carModel: {
    type: String,
    trim: true
  },
  year: {
    type: String,
    trim: true
  },

  subject: {
    type: String,
    required: [true, 'Subiectul este obligatoriu'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Mesajul este obligatoriu'],
    trim: true
  },

  status: {
    type: String,
    enum: ['new', 'read', 'resolved'],
    default: 'new'
  }
}, {
  timestamps: true
});

contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
