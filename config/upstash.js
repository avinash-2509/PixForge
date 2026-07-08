// config/upstash.js
import { Redis } from '@upstash/redis';
import dotenv from "dotenv"

dotenv.config();

// Instantiate serverless connection parameters via REST endpoints
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Self-executing diagnostic ping to verify lines immediately
(async () => {
  try {
    await redis.ping();
    console.log('Upstash Serverless Redis Connection Verified.');
  } catch (error) {
    console.error(`Upstash Redis Authorization Failure: ${error.message}`);
  }
})();

export default redis