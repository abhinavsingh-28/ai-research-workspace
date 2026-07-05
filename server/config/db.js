// ============================================
// Database Connection Module
// ============================================
// This file has ONE job: connect to MongoDB using Mongoose.
// We keep it separate from index.js because of "separation of concerns" —
// each file should do one thing well.

// Import the Mongoose library — our ODM (Object-Document Mapper)
// that provides schemas, validation, and query building on top of MongoDB.
import mongoose from 'mongoose';

// --------------------------------------------
// connectDB — Establishes connection to MongoDB
// --------------------------------------------
// This is an async function because connecting to a database is a
// network operation that takes time. The 'async' keyword lets us
// use 'await' to pause until the connection completes (or fails).
const connectDB = async () => {
  try {
    // mongoose.connect() opens a connection to the MongoDB server.
    // process.env.MONGODB_URI reads the connection string from the .env file.
    // Example value: "mongodb://localhost:27017/ai-research-workspace"
    //
    // 'await' pauses this function until the connection is fully established.
    // If it succeeds, it returns a connection object with details about the connection.
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // Log which host we connected to (e.g., "localhost" or a cloud server).
    // This confirms the connection worked and tells us WHERE we're connected.
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    // If the connection fails (MongoDB isn't running, wrong URI, network issue),
    // we end up here.
    console.error(`MongoDB connection error: ${error.message}`);

    // process.exit(1) kills the entire Node.js process.
    // Exit code 1 means "exited due to an error" (0 means "exited normally").
    //
    // WHY crash the whole server? Because if we can't reach the database,
    // the server is useless — every API call that needs data would fail anyway.
    // It's better to crash immediately with a clear error message than to
    // start the server and have every request fail mysteriously.
    process.exit(1);
  }
};

// Export the function so index.js can import and call it.
export default connectDB;
