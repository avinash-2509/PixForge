

import dotenv from "dotenv";
import connectDB from "./config/db.js";
import "./config/upstash.js"; // Executes the file
import { connectRabbitMQ } from "./config/cloudamqp.js";

dotenv.config();

async function testPhaseOne() {
  console.log('--- PixelForge Async: Booting Infrastructure Diagnostics ---');
  
  // Fire sequential database and message broker handshakes
  await connectDB();
  await connectRabbitMQ();
  
  console.log('🏁 Phase 1 Success: All cloud conduits are operational!');
}

testPhaseOne();