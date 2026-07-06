// ============================================
// AI Research Workspace — Express Server
// ============================================
// This is the main entry point. It wires everything together:
//   1. Load environment variables
//   2. Create the Express app
//   3. Apply middleware
//   4. Connect to MongoDB
//   5. Mount routes
//   6. Start listening for requests
//
// Run this file with:   npm run dev   (auto-restarts on changes)
// Or:                   npm start     (no auto-restart)

// =============================================
// Step 1: Load environment variables
// =============================================
// This MUST be the very first import in this file.
// It reads the .env file (in the project root) and makes all
// key=value pairs available via process.env.KEY_NAME.
//
// For example, MONGODB_URI=mongodb://localhost:27017/ai-research-workspace
// becomes accessible as process.env.MONGODB_URI
//
// If this isn't first, other modules that use process.env during
// import time would get 'undefined' values — a silent, confusing bug.
// We use dotenv.config() with an explicit path because the .env file
// lives in the project root (one level up from server/), not in server/.
// If we used the simpler 'import dotenv/config', it would look for .env
// in the current working directory — which is server/ when you run npm run dev.
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// __dirname doesn't exist in ES modules, so we recreate it:
// import.meta.url gives us the file:// URL of this file
// fileURLToPath() converts it to a normal file path
// dirname() extracts the directory part
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the project root (one level up from server/)
dotenv.config({ path: resolve(__dirname, '../.env') });

// =============================================
// Step 2: Import dependencies
// =============================================
// express — the web framework that handles HTTP requests and responses.
import express from 'express';

// cors — middleware that allows cross-origin requests.
// Our React frontend (port 5173) needs to make requests to this server (port 5000).
// Without CORS, the browser would block those requests due to the Same-Origin Policy.
import cors from 'cors';

// Our custom modules:
// connectDB — the function that connects to MongoDB (from config/db.js).
import connectDB from './config/db.js';

// healthRoutes — the router that handles GET /api/health (from routes/healthRoutes.js).
import healthRoutes from './routes/healthRoutes.js';

// authRoutes — the router that handles POST /api/auth/signup and POST /api/auth/login.
import authRoutes from './routes/authRoutes.js';

// =============================================
// Step 3: Create the Express application
// =============================================
// express() creates an Express application object. This is the core of your server.
// Everything — middleware, routes, error handlers — gets attached to this object.
// Think of it as the "control center" that receives every incoming request and
// decides what to do with it.
const app = express();

// =============================================
// Step 4: Apply middleware
// =============================================
// app.use(middleware) registers a middleware function.
// Middleware runs on EVERY incoming request, in the order listed here.
// The request passes through each middleware like a pipeline:
//   Request → cors() → express.json() → your route handler → Response

// cors() — Adds Cross-Origin Resource Sharing headers to every response.
// This tells browsers: "Yes, requests from other origins (like localhost:5173) are allowed."
// Without this, your React frontend would get CORS errors on every API call.
app.use(cors());

// express.json() — Parses incoming request bodies that have Content-Type: application/json.
// When the frontend sends a POST request with a JSON body like:
//   { "question": "What is RAG?" }
// This middleware reads the raw bytes from the network, parses them as JSON,
// and stores the result in req.body so your route handler can access it.
// Without this, req.body would be undefined.
app.use(express.json());

// =============================================
// Step 5: Mount routes
// =============================================
// app.use(path, router) tells Express:
//   "Any request whose URL starts with this path should be handled by this router."
//
// So when a request comes in for GET /api/health:
//   1. Express sees the URL starts with '/api/health'
//   2. It strips '/api/health' from the URL, leaving '/'
//   3. It passes the request to healthRoutes, which has a handler for GET '/'
//   4. The handler runs and sends back the response
app.use('/api/health', healthRoutes);

// Auth routes — signup and login. No JWT required for these routes
// (users need to be able to register and log in without being authenticated first).
app.use('/api/auth', authRoutes);

// =============================================
// Step 6: Connect to MongoDB, then start the server
// =============================================
// Read the port from environment variables, or use 5000 as a fallback.
// The || operator means: "if the left side is falsy (undefined, empty, null), use the right side."
const PORT = process.env.SERVER_PORT || 5000;

// We connect to MongoDB BEFORE starting the server.
// connectDB() returns a Promise (because it's an async function).
// .then() runs the callback only after the Promise resolves successfully.
//
// WHY connect first? If a user's request arrives before MongoDB is connected,
// every database query in that request would fail. By connecting first,
// we guarantee the database is ready before the first request comes in.
//
// If connectDB() fails, it calls process.exit(1) internally, so
// app.listen() never runs — the server never starts.
connectDB().then(() => {
  // app.listen(port, callback) tells the operating system:
  //   "Open this port and forward any incoming TCP connections to this Node.js process."
  // The callback runs once the port is successfully opened and the server is ready.
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
});
