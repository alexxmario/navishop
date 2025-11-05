import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  category: { type: String },
  brand: { type: String },
  sku: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  discount: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  features: [String],
  technicalFeatures: [String],
  connectivityOptions: [String],
  structuredDescription: {
    sections: [{
      title: String,
      icon: String,
      points: [String]
    }]
  },
  romanianSpecs: {
    hardware: {
      memorieRAM: String,
      capacitateStocare: String,
      modelProcesor: String
    },
    display: {
      diagonalaDisplay: String,
      rezolutieDisplay: String,
      tehnologieDisplay: String
    },
    connectivity: {
      conectivitate: String,
      bluetooth: String
    },
    features: {
      functii: String,
      splitScreen: String,
      limbiInterfata: String
    },
    compatibility: {
      destinatPentru: String,
      tipMontare: String
    },
    package: {
      continutPachet: String
    }
  },
  warranty: { type: Number, default: 12 },
  status: { type: String, default: 'active' },
  featured: { type: Boolean, default: false },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);