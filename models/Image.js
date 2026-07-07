// models/Image.js
import mongoose from 'mongoose';

// Sub-schema layout for tracking individual transformed asset instances
const variantSchema = new mongoose.Schema({
  transformationType: { 
    type: String, 
    required: true // e.g., 'w800_h600_grayscale' or 'pdf_format'
  }, 
  url: { 
    type: String, 
    required: true 
  },
  storageKey: { 
    type: String, 
    required: true // Path locator identifier inside Cloudflare R2 / AWS S3
  }
}, { 
  timestamps: true 
});

const imageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Critical database index to ensure fast query filtration and strict tenant isolation
  },
  originalName: { 
    type: String, 
    required: true 
  },
  originalUrl: { 
    type: String, 
    required: true 
  },
  storageKey: { 
    type: String, 
    required: true // Initial raw asset path locator reference inside cloud storage
  }, 
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending' // Default state until a background worker updates the record state
  },
  variants: [variantSchema] // Embedded variant array layout for high-performance scale reading
}, { 
  timestamps: true 
});

export default mongoose.model('Image', imageSchema);