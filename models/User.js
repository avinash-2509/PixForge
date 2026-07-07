// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true // Fast-lookup database index optimization
  },
  password: {
    type: String,
    required: true
  }
}, { 
  timestamps: true // Automatically tracks account creation and update lifecycles
});

export default mongoose.model('User', userSchema);