// ============================================
// Auth Routes — Signup & Login
// ============================================
// These routes handle user registration and authentication.
// Neither route requires a JWT token (obviously — you can't require
// login before the user has an account or has logged in).
//
// POST /api/auth/signup  → Create a new account, return token
// POST /api/auth/login   → Authenticate existing user, return token

import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// ============================================
// Helper: Generate a JWT Token
// ============================================
// We'll call this function in both signup and login routes,
// so we extract it here to avoid duplication (DRY principle).
//
// jwt.sign(payload, secret, options) creates a new JWT token:
//   - payload: the data to encode (userId). This is NOT encrypted —
//     anyone can decode it. The signature just prevents tampering.
//   - secret: the key used to create the signature (from .env).
//     NEVER hardcode this. If leaked, anyone can forge tokens.
//   - expiresIn: how long the token is valid. '7d' = 7 days.
//     After expiration, jwt.verify() will reject it.
//     Common values: '1h', '24h', '7d', '30d'.
const generateToken = (userId) => {
  return jwt.sign(
    { userId },              // Payload — the data inside the token
    process.env.JWT_SECRET,  // Secret — the signing key
    { expiresIn: '7d' }     // Options — token expires in 7 days
  );
};

// ============================================
// POST /signup — Create a New User
// ============================================
// Request body: { name: "Abhinav", email: "a@b.com", password: "secret123" }
// Response: { user: { id, name, email }, token: "eyJhbG..." }
//
// Flow:
//   1. Extract name, email, password from request body
//   2. Check if email already exists → 400 if yes
//   3. Create user (password auto-hashed by pre-save hook)
//   4. Generate JWT token
//   5. Return user data + token
router.post('/signup', async (req, res) => {
  try {
    // ---- Step 1: Extract input from the request body ----
    //
    // req.body contains the parsed JSON from the request.
    // This works because express.json() middleware parses it for us.
    // Destructuring extracts the three fields we need.
    const { name, email, password } = req.body;

    // ---- Step 2: Validate required fields ----
    //
    // Even though Mongoose has 'required: true' validators, it's better to
    // check early and return a clear error message. Mongoose errors are
    // less user-friendly ("Path `name` is required" vs "All fields are required").
    if (!name || !email || !password) {
      // 400 Bad Request — the client sent incomplete data.
      return res.status(400).json({ message: 'All fields are required (name, email, password).' });
    }

    // ---- Step 3: Check if email already exists ----
    //
    // User.findOne({ email }) searches the "users" collection for a document
    // with this email. Returns the document if found, or null if not.
    //
    // Why check before creating? Two reasons:
    //   1. We can return a specific error message ("Email already registered")
    //   2. Without this, Mongoose would throw a cryptic "E11000 duplicate key" error
    //      because of the unique: true constraint — not user-friendly.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // ---- Step 4: Create the user ----
    //
    // User.create() does three things:
    //   1. Creates a new document in memory
    //   2. Runs all validators (required, minlength, etc.)
    //   3. Triggers the pre-save hook (which hashes the password)
    //   4. Saves the document to MongoDB
    //
    // After this line, the password in the database is a bcrypt hash,
    // NOT "secret123".
    const user = await User.create({ name, email, password });

    // ---- Step 5: Generate a JWT token ----
    //
    // user._id is the auto-generated MongoDB ObjectId for this new user.
    // We embed it in the token so that on future requests, the auth middleware
    // can identify which user is making the request.
    const token = generateToken(user._id);

    // ---- Step 6: Send the response ----
    //
    // Status 201 = "Created" — the standard code when a new resource is created.
    // We return the user data (WITHOUT the password) and the token.
    //
    // Why not return the password? Even though it's hashed, there's no reason
    // to send it to the client. Principle of least privilege.
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    // ---- Error handling ----
    //
    // If Mongoose validation fails (e.g., password too short), error.message
    // will contain something like "Password must be at least 6 characters".
    // We send it back so the client knows what went wrong.
    //
    // 500 Internal Server Error is a catch-all for unexpected errors.
    // In production, you'd log the full error but send a generic message to the client.
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// ============================================
// POST /login — Authenticate a User
// ============================================
// Request body: { email: "a@b.com", password: "secret123" }
// Response: { user: { id, name, email }, token: "eyJhbG..." }
//
// Flow:
//   1. Find user by email → 401 if not found
//   2. Compare password with stored hash → 401 if mismatch
//   3. Generate JWT token
//   4. Return user data + token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ---- Step 1: Validate input ----
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // ---- Step 2: Find user by email ----
    //
    // User.findOne({ email }) searches for a user with this email.
    // If not found, returns null.
    //
    // SECURITY NOTE: We return the SAME error message for "user not found"
    // and "wrong password". Why? If we said "User not found", an attacker
    // could probe which emails are registered in our system (user enumeration).
    // A generic "Invalid credentials" prevents this.
    const user = await User.findOne({ email });
    if (!user) {
      // 401 Unauthorized — authentication failed.
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ---- Step 3: Compare passwords ----
    //
    // user.comparePassword() is the instance method we defined on the schema.
    // It calls bcrypt.compare(inputPassword, storedHash) internally.
    // Returns true if the passwords match, false otherwise.
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Same error message as "user not found" — prevents user enumeration.
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ---- Step 4: Generate token and respond ----
    //
    // If we get here, the user exists AND the password is correct.
    // Generate a fresh token and send it back.
    const token = generateToken(user._id);

    // Status 200 = "OK" — the default success code.
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

export default router;
