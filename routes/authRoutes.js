// routes/authRoutes.js
import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js'; // Explicit extension required

const router = express.Router();

// Clean mapping decoupling endpoint logic away from server root files
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router