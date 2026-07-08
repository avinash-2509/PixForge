// worker.js
import 'dotenv/config';
import mongoose from 'mongoose';
import amqp from 'amqplib';
import sharp from 'sharp';
import { Readable } from 'stream';
import cloudinary from './config/cloudinary.js';
import Image from './models/Image.js';

// 1. Establish database connection for the worker process
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Worker process connected to MongoDB.');
  } catch (err) {
    console.error('Worker MongoDB connection failed:', err);
    process.exit(1);
  }
};

// Helper utility to convert a Buffer into a readable stream
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signals the end of the stream
  return stream;
};

// Helper to upload transformed buffers back to Cloudinary via streams
const uploadStreamToCloudinary = (buffer, publicIdSuffix) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'pixelforge_variants',
        public_id: `${publicIdSuffix}_${Date.now()}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    bufferToStream(buffer).pipe(stream);
  });
};

const startWorker = async () => {
  await connectDB();

  try {
    // 2. Connect to RabbitMQ (CloudAMQP) and create channel
    const connection = await amqp.connect(process.env.CLOUDAMQP_URL);
    const channel = await connection.createChannel();
    const queue = 'image_jobs';

    await channel.assertQueue(queue, { durable: true });

    // 3. Set Prefetch Limit (pull exactly 1 task at a time)
    channel.prefetch(1);
    console.log(`Worker process listening on queue: ${queue}`);

    // 4. Start consuming queue messages
    channel.consume(queue, async (msg) => {
      if (!msg) return;

      const jobData = JSON.parse(msg.content.toString());
      const { imageId, storageKey, originalUrl, customTransform } = jobData;

      console.log(`[Worker] Processing started for image: ${imageId}`);

      try {
        // Step A: Update image status in MongoDB to 'processing'
        await Image.findByIdAndUpdate(imageId, { status: 'processing' });

        // Step B: Download original image into a Buffer
        const response = await fetch(originalUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch original image: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const originalBuffer = Buffer.from(arrayBuffer);

        const variants = [];

        if (customTransform) {
          console.log(`[Worker] Running custom transform: ${customTransform.name} for image: ${imageId}`);

          // Build dynamic Sharp chain
          let sharpInstance = sharp(originalBuffer);

          // 1. Crop (applied first so resize operates on the cropped box)
          if (customTransform.crop) {
            const { left, top, width, height } = customTransform.crop;
            sharpInstance = sharpInstance.extract({ left, top, width, height });
          }

          // 2. Resize
          if (customTransform.resize) {
            const { width, height, fit } = customTransform.resize;
            sharpInstance = sharpInstance.resize(width || null, height || null, { fit: fit || 'cover' });
          }

          // 3. Compression & Format
          const format = customTransform.compression?.format || 'webp';
          const quality = customTransform.compression?.quality || 80;
          sharpInstance = sharpInstance.toFormat(format, { quality });

          // Run transformation and get buffer
          const transformedBuffer = await sharpInstance.toBuffer();

          // Upload stream back to Cloudinary
          const uploadResult = await uploadStreamToCloudinary(transformedBuffer, `${storageKey}_${customTransform.name}`);

          // Track variant details
          variants.push({
            transformationType: customTransform.name,
            url: uploadResult.secure_url,
            storageKey: uploadResult.public_id
          });

          // Step E: Save all generated variants to MongoDB and mark image as 'completed'
          await Image.findByIdAndUpdate(imageId, {
            status: 'completed',
            $push: { variants: { $each: variants } }
          });

          console.log(`[Worker] Completed processing for image: ${imageId}`);
        } else {
          console.log(`[Worker] Received default image upload pointer for image: ${imageId}. No custom transform requested. Skipping.`);
        }

        // Step F: Manually Acknowledge the message (deletes it from the RabbitMQ queue)

        channel.ack(msg);


      } catch (err) {
        console.error(`[Worker] Error processing image ${imageId}:`, err);

        try {
          // If a crash happens, mark the status as 'failed' in MongoDB
          await Image.findByIdAndUpdate(imageId, { status: 'failed' });
        } catch (dbErr) {
          console.error(`[Worker] Failed to write error status to database:`, dbErr);
        }

        // Acknowledge the message on execution error to prevent a poison loop
        channel.ack(msg);
      }
    }, { noAck: false }); // noAck: false enables manual acknowledgements

  } catch (error) {
    console.error('Worker failed to connect to RabbitMQ:', error);
    process.exit(1);
  }
};

startWorker();
