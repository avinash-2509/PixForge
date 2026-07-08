// controllers/imageController.js
import busboy from 'busboy';
import cloudinary from '../config/cloudinary.js';
import Image from '../models/Image.js';
import { getChannel } from '../config/cloudamqp.js';

// Handler to stream image to Cloudinary, save metadata, and enqueue task
export const uploadImage = async (req, res) => {
    try {
        const bb = busboy({ headers: req.headers });
        let fileUploaded = false;

        bb.on('file', (name, file, info) => {
            const { filename, mimeType } = info;

            // Validate that the uploaded file is actually an image
            if (!mimeType.startsWith('image/')) {
                file.resume(); // Consume and discard the stream
                return res.status(400).json({ error: 'Only image files are allowed.' });
            }

            fileUploaded = true;

            // Pipe the incoming stream directly into Cloudinary's upload stream
            const cloudinaryStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'pixelforge_originals',
                    resource_type: 'image',
                },
                async (error, result) => {
                    if (error) {
                        console.error('Cloudinary Upload Error:', error);
                        if (!res.headersSent) {
                            return res.status(500).json({ error: 'Failed to upload image to Cloudinary.' });
                        }
                        return;
                    }

                    try {
                        // 1. Create Image document in MongoDB (Initial status is completed since original is uploaded)
                        const newImage = await Image.create({
                            userId: req.user.id,
                            originalName: filename,
                            originalUrl: result.secure_url,
                            storageKey: result.public_id,
                            status: 'completed',
                            variants: []
                        });

                        console.log(`Image successfully uploaded and registered: ${newImage._id}`);

                        // 2. Respond immediately with 201 Created
                        if (!res.headersSent) {
                            return res.status(201).json({
                                message: 'Image upload completed successfully.',
                                image: newImage
                            });
                        }

                    } catch (dbOrQueueError) {
                        console.error('Database processing error:', dbOrQueueError);
                        if (!res.headersSent) {
                            return res.status(500).json({ error: 'Failed to register uploaded image.' });
                        }
                    }

                }
            )
                ;

            // Pipe request file stream to Cloudinary write-stream
            file.pipe(cloudinaryStream);
        });

        bb.on('finish', () => {
            // If the finish event triggers and no file event occurred
            if (!fileUploaded && !res.headersSent) {
                return res.status(400).json({ error: 'No file found in the request payload.' });
            }
        });

        // Pipe the Express request stream directly to busboy for parsing
        req.pipe(bb);

    } catch (err) {
        console.error('Busboy parsing failure:', err);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Failed to parse request stream.' });
        }
    }
};

// Handler to fetch all images for the logged-in user
export const getUserImages = async (req, res) => {
    try {
        const images = await Image.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json(images);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Handler to fetch a single image and all its variants (Single disk read)
export const getImageById = async (req, res) => {
    try {
        const image = await Image.findOne({ _id: req.params.id, userId: req.user.id });
        if (!image) {
            return res.status(404).json({ error: 'Image not found.' });
        }
        return res.status(200).json(image);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Handler to trigger a custom transformation (crop, resize, compression)
export const createCustomTransform = async (req, res) => {
    try {
        const { id } = req.params;
        const { resize, crop, compression } = req.body;

        // 1. Fetch image and verify ownership
        const image = await Image.findOne({ _id: id, userId: req.user.id });
        if (!image) {
            return res.status(404).json({ error: 'Image not found.' });
        }

        // 2. Validate inputs
        if (crop) {
            const { left, top, width, height } = crop;
            if (left === undefined || top === undefined || !width || !height || left < 0 || top < 0 || width <= 0 || height <= 0) {
                return res.status(400).json({ error: 'Invalid crop dimensions. left, top, width, and height must be positive integers.' });
            }
        }
        if (resize) {
            const { width, height } = resize;
            if ((width !== undefined && width <= 0) || (height !== undefined && height <= 0)) {
                return res.status(400).json({ error: 'Invalid resize dimensions. width and height must be positive integers.' });
            }
        }
        const quality = compression?.quality || 80;
        if (quality < 1 || quality > 100) {
            return res.status(400).json({ error: 'Quality must be an integer between 1 and 100.' });
        }

        // 3. Generate a descriptive name for this variant
        let name = 'custom';
        if (crop) name += `_crop_${crop.width}x${crop.height}`;
        if (resize) name += `_resize_${resize.width || 'auto'}x${resize.height || 'auto'}`;
        if (compression) name += `_${compression.format || 'webp'}_q${quality}`;

        // 4. Publish processing job to RabbitMQ queue
        const channel = getChannel();
        if (!channel) {
            throw new Error('RabbitMQ channel is not initialized.');
        }

        const jobPayload = {
            imageId: image._id,
            storageKey: image.storageKey,
            originalUrl: image.originalUrl,
            customTransform: {
                name,
                resize,
                crop,
                compression: {
                    format: compression?.format || 'webp',
                    quality
                }
            }
        };

        channel.sendToQueue(
            'image_jobs',
            Buffer.from(JSON.stringify(jobPayload)),
            { persistent: true }
        );

        console.log(`Custom transformation job successfully enqueued for image: ${image._id} (Variant: ${name})`);

        // 5. Update main status to 'processing'
        image.status = 'processing';
        await image.save();

        return res.status(202).json({
            message: 'Custom transformation accepted and queued for processing.',
            variantName: name,
            image
        });

    } catch (err) {
        console.error('Custom transformation creation failure:', err);
        return res.status(500).json({ error: err.message });
    }
};

