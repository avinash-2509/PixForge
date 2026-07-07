// config/db.js
import mongoose  from "mongoose";
import dotenv from "dotenv"

dotenv.config();

const connectDB = async () => {
  try {
    // Establish connection pool properties explicitly
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      maxPoolSize: 10,                 // Keeps database handles constrained safely
      serverSelectionTimeoutMS: 5000,  // Fail fast rather than locking requests if down
    });
    console.log(`🚀 Database Layer Online: Connected to host -> ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Core Database Connection Error: ${error.message}`);
    process.exit(1);                   // Terminate application execution on connection failure
  }
};

export default connectDB;

