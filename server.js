// server.js
import 'dotenv/config'; // Modern clean environment initialization
import express from 'express';
import cors from 'cors';

import connectDB from './config/db.js';
import imageRoutes from './routes/imageRoutes.js';

import { connectRabbitMQ } from './config/cloudamqp.js';
import authRoutes from './routes/authRoutes.js'; // Modern ES Module Router import

const app = express();

// Global System Parsing Hook Middlewares
app.use(cors());
app.use(express.json());

// Boot underlying infrastructure clusters concurrently
connectDB();
connectRabbitMQ().catch(err => console.error('RabbitMQ boot connection failed:', err.message));

app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);

// Import worker.js to start RabbitMQ consumer listener in the unified process
import './worker.js';

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`PixelForge Web Engine rendering natively via ES Modules on port: ${PORT}`));