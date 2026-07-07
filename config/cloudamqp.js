// config/cloudamqp.js
import dotenv from "dotenv"

dotenv.config();

import amqp from "amqplib";

let amqpConnection = null;
let amqpChannel = null;

export const connectRabbitMQ = async () => {
  try {
    // Connect to CloudAMQP
    amqpConnection = await amqp.connect(process.env.CLOUDAMQP_URL);

    // Create a channel
    amqpChannel = await amqpConnection.createChannel();

    // Create the queue if it doesn't exist
    await amqpChannel.assertQueue("image_jobs", {
      durable: true,
    });

    console.log("🚀 CloudAMQP Broker Connected & Queue Ready.");

    return amqpChannel;
  } catch (error) {
    console.error(`❌ CloudAMQP Connection Failed: ${error.message}`);
    throw error;
  }
};

export const getChannel = () => {
  return amqpChannel;
};