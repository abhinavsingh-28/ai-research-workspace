// ============================================
// Health Check Routes
// ============================================
// A "health check" endpoint is an industry standard.
// Monitoring tools, load balancers, and deployment pipelines
// hit this URL to verify the server is alive and its dependencies
// (like the database) are working.
//
// URL: GET /api/health
// Response: { status, service, timestamp, database }

// Import Express to create a router.
import express from 'express';
// Import Mongoose to check the database connection status.
import mongoose from 'mongoose';

// --------------------------------------------
// Create a Router
// --------------------------------------------
// express.Router() creates a "mini-application" — a group of related routes.
// Instead of putting all routes directly on the main app object, we organize
// them into separate routers by feature: health routes, auth routes, paper routes, etc.
// This keeps each file small and focused.
const router = express.Router();

// --------------------------------------------
// GET / — Health Check
// --------------------------------------------
// router.get(path, handler) means:
//   "When someone sends a GET request to this path, run this handler function."
//
// The path '/' here is RELATIVE to where this router is mounted.
// In index.js, we mount it at '/api/health', so:
//   '/' in this file = '/api/health' in the full URL.
//
// (req, res) are the two arguments Express passes to every route handler:
//   req (request)  — info about the incoming request (URL, headers, body, etc.)
//   res (response) — tools to send a response back (.json(), .status(), etc.)
router.get('/', (req, res) => {
  // Check the current MongoDB connection state.
  // mongoose.connection.readyState returns a number:
  //   0 = disconnected (no connection at all)
  //   1 = connected (everything working)
  //   2 = connecting (in the process of connecting)
  //   3 = disconnecting (shutting down the connection)
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  // res.json() sends a JSON response. Express automatically:
  //   1. Converts this JavaScript object into a JSON string
  //   2. Sets the Content-Type header to 'application/json'
  //   3. Sets the status code to 200 (the default for successful responses)
  //   4. Sends the response back to the client
  res.json({
    status: 'ok',                           // Overall server health
    service: 'ai-research-workspace-api',   // Service identifier
    timestamp: new Date().toISOString(),    // Current time in ISO format (e.g., "2026-07-05T14:30:00.000Z")
    database: dbStatus,                     // MongoDB connection status
  });
});

// Export the router so index.js can mount it with app.use().
export default router;
