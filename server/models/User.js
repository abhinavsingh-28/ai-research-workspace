// ============================================
// User Model — Mongoose Schema
// ============================================
// This file defines what a "User" looks like in our MongoDB database.
// It creates a schema (the rules) and a model (the class we use to interact with the collection).
//
// MongoDB collection: "users" (Mongoose auto-pluralizes the model name "User")

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ============================================
// Define the Schema
// ============================================
// A schema is like a blueprint — it says:
//   "Every User document MUST have these fields, with these types and rules."
// If someone tries to save a User without a required field, Mongoose throws an error
// BEFORE it even touches the database.
const userSchema = new mongoose.Schema(
  {
    // --- name ---
    // The user's display name.
    // type: String — must be a string (not a number, not an array, etc.)
    // required: [true, 'Name is required'] — the second value is a custom error message
    //   that appears when validation fails. Much friendlier than the default error.
    // trim: true — automatically removes leading/trailing whitespace
    //   ("  Abhinav  " becomes "Abhinav"). Prevents invisible space bugs.
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    // --- email ---
    // The user's email address. Used as their login identifier.
    // unique: true — creates a MongoDB "unique index" on this field.
    //   This means MongoDB itself enforces that no two documents can have the same email.
    //   If you try to insert a duplicate, MongoDB throws error code 11000.
    // lowercase: true — automatically converts to lowercase before saving.
    //   This prevents "Abhinav@Gmail.com" and "abhinav@gmail.com" from being treated
    //   as different users.
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    // --- password ---
    // The user's password. NEVER stored as plain text.
    // By the time this hits the database, it will be a bcrypt hash like:
    //   "$2a$10$X7dJk3R5q2W8..."
    // The pre-save hook (below) handles the hashing automatically.
    // minlength: [6, '...'] — rejects passwords shorter than 6 characters.
    //   This validation runs on the ORIGINAL input, before hashing.
    //   (After hashing, the string is always 60 characters.)
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
  },
  {
    // --- Schema Options ---
    // timestamps: true — automatically adds two fields to every document:
    //   createdAt: Date — when the document was first created
    //   updatedAt: Date — when the document was last modified
    // You don't need to manage these yourself; Mongoose handles them.
    timestamps: true,
  }
);

// ============================================
// Pre-Save Hook — Hash Password Before Saving
// ============================================
// This middleware runs BEFORE every .save() call on a User document.
// It intercepts the document, hashes the password, then lets the save proceed.
//
// WHY a hook instead of hashing in the route handler?
// Because this keeps the hashing logic with the model (where it belongs).
// No matter WHERE you create or update a user (signup route, admin panel,
// password reset, etc.), the password will always be hashed automatically.
//
// IMPORTANT: We use a regular function (not an arrow function) because
// we need 'this' to refer to the document being saved.
// Arrow functions don't have their own 'this' — they inherit from the
// surrounding scope, which would NOT be the document.
userSchema.pre('save', async function () {
  // this.isModified('password') returns true only if the password field
  // has been changed (or is being set for the first time).
  //
  // WHY check this? Because .save() is called for ANY update to the user
  // (e.g., changing their name). Without this check, we'd re-hash an
  // already-hashed password, making it impossible to log in:
  //   Original: "mySecret123" → hash_A (correct)
  //   Re-hash:  hash_A → hash_B (hash of a hash — now login breaks!)
  if (!this.isModified('password')) {
    return; // Skip hashing, proceed to save
  }

  // bcrypt.genSalt(10) generates a random salt with cost factor 10.
  // Cost factor 10 means 2^10 = 1,024 iterations of the hashing algorithm.
  // Higher = slower = more secure, but also slower for your server.
  // 10 is the recommended balance for most applications (~100ms per hash).
  const salt = await bcrypt.genSalt(10);

  // bcrypt.hash(plainText, salt) combines the password with the salt
  // and runs the bcrypt algorithm. The output is a 60-character string like:
  //   "$2a$10$X7dJk3R5q2W8n1Qw3E4r5uY6t7I8o9P0aS1dF2gH3jK4lZ5xC6vB"
  //   ^^^^  ^^  ^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //   algo  cost     salt (22 chars)           hash (31 chars)
  //
  // The salt is embedded IN the hash output, so you don't store it separately.
  this.password = await bcrypt.hash(this.password, salt);

  // In Mongoose 9 with async hooks, we just return — no need to call next().
  // Mongoose automatically waits for the async function to resolve,
  // then proceeds with the save operation.
});

// ============================================
// Instance Method — Compare Passwords
// ============================================
// This adds a custom method to every User document instance.
// We can call user.comparePassword("input") to check if a password matches.
//
// WHY an instance method instead of doing bcrypt.compare() in the route?
// Same reason as the hook: keeps password logic with the model.
// The route just calls user.comparePassword() and doesn't need to know
// about bcrypt internals.
userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare() takes the plain-text input, extracts the salt from
  // the stored hash (this.password), re-hashes the input with that salt,
  // and checks if the results match.
  // Returns true if they match, false otherwise.
  return bcrypt.compare(candidatePassword, this.password);
};

// ============================================
// Compile and Export the Model
// ============================================
// mongoose.model('User', userSchema) does two things:
//   1. Tells Mongoose to create a collection called "users" in MongoDB
//      (it lowercases and pluralizes the name "User" → "users")
//   2. Returns a Model class that we use to create, read, update, and delete documents
//
// With this model, we can now do:
//   User.create({ name, email, password })  → insert a new user
//   User.findOne({ email })                 → find a user by email
//   User.findById(id)                       → find a user by their _id
const User = mongoose.model('User', userSchema);

export default User;
