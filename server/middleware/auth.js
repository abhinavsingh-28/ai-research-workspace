// ============================================
// Auth Middleware — JWT Verification
// ============================================
// This middleware protects routes that require authentication.
// It sits between the incoming request and the route handler:
//
//   Request → cors() → express.json() → auth() → your route handler
//
// If the request has a valid JWT token, it attaches the user's ID to req.user
// and calls next() to let the request proceed.
// If the token is missing or invalid, it returns 401 Unauthorized immediately.
//
// Usage in routes:
//   import auth from '../middleware/auth.js';
//   router.get('/papers', auth, (req, res) => {
//     // req.user.userId is available here
//   });

import jwt from 'jsonwebtoken';

// The middleware function.
// Express middleware always receives three arguments: req, res, next.
const auth = (req, res, next) => {
  // ---- Step 1: Get the token from the request header ----
  //
  // The client sends the token in the "Authorization" header like this:
  //   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQi...
  //
  // req.header('Authorization') reads this header value.
  // If the header doesn't exist, it returns undefined.
  const authHeader = req.header('Authorization');

  // Check if the header exists AND starts with "Bearer ".
  // If not, the user isn't authenticated — reject the request.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // res.status(401) sets the HTTP status code to 401 (Unauthorized).
    // .json() sends a JSON response body.
    // We return here to stop execution — without return, the code below would still run.
    return res.status(401).json({ message: 'No token provided. Access denied.' });
  }

  // ---- Step 2: Extract the raw token ----
  //
  // The header value is "Bearer eyJhbG..." — we need just the token part.
  // .split(' ')[1] splits by space and takes the second element (index 1).
  //   "Bearer eyJhbG..." → ["Bearer", "eyJhbG..."] → "eyJhbG..."
  const token = authHeader.split(' ')[1];

  try {
    // ---- Step 3: Verify and decode the token ----
    //
    // jwt.verify() does two things:
    //   1. Checks the SIGNATURE — was this token signed with our JWT_SECRET?
    //      If someone tampered with the payload, the signature won't match → throws error.
    //   2. Checks EXPIRATION — is the token expired? If the current time is past
    //      the 'exp' claim → throws error.
    //   3. DECODES the payload — returns the data we put in when we signed the token.
    //
    // If verification succeeds, 'decoded' looks like:
    //   { userId: "668abc...", iat: 1720000000, exp: 1720604800 }
    //   - userId: the user's MongoDB _id (we put this in during signup/login)
    //   - iat: "issued at" — Unix timestamp when the token was created
    //   - exp: "expires" — Unix timestamp when the token becomes invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ---- Step 4: Attach user info to the request ----
    //
    // We add a 'user' property to the request object.
    // This makes the user's ID available to any route handler that comes AFTER
    // this middleware in the pipeline.
    //
    // Example: in a route handler, you can do:
    //   const papers = await Paper.find({ userId: req.user.userId });
    req.user = { userId: decoded.userId };

    // ---- Step 5: Call next() to proceed ----
    //
    // next() passes the request to the next middleware or route handler.
    // Without this call, the request would hang forever — the client
    // would never get a response.
    next();
  } catch (error) {
    // If jwt.verify() throws an error, it means either:
    //   - The token's signature is invalid (tampered with or wrong secret)
    //   - The token has expired
    //   - The token is malformed (not a valid JWT string)
    //
    // In all cases, we reject the request with 401.
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default auth;
