// routes/imageRoutes.js
import express from 'express';
import { uploadImage, getUserImages, getImageById, createCustomTransform } from '../controllers/imageController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all image routes for tenant isolation
router.use(authMiddleware);

router.post('/upload', uploadImage);
router.get('/', getUserImages);
router.get('/:id', getImageById);
router.post('/:id/transform', createCustomTransform);

export default router;



