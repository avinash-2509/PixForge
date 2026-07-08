// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary automatically picks up the CLOUDINARY_URL environment variable from .env
cloudinary.config();

export default cloudinary;
