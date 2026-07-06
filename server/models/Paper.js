// ============================================
// Paper Model — Mongoose Schema
// ============================================
// This file defines what a "Paper" document looks like in MongoDB.
// A Paper represents an uploaded research paper (PDF).
//
// The actual PDF file is stored on DISK in the uploads/ folder.
// This schema stores only the METADATA (title, filename, size, etc.)
// plus a reference to which user uploaded it.
//
// MongoDB collection: "papers" (auto-pluralized from "Paper")

import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema(
  {
    // --- title ---
    // The paper's display title (e.g., "Attention Is All You Need").
    // Users can provide this when uploading; if they don't, we'll
    // default to the original filename (set in the route handler).
    title: {
      type: String,
      required: [true, 'Paper title is required'],
      trim: true,
    },

    // --- fileName ---
    // The name of the file ON DISK in the uploads/ folder.
    // This is the Multer-generated unique name, e.g., "1720000000-attention.pdf".
    // We need this to:
    //   1. Construct the file URL for the PDF viewer (http://localhost:5001/uploads/fileName)
    //   2. Find and delete the file when the user deletes the paper
    fileName: {
      type: String,
      required: true,
    },

    // --- originalName ---
    // The original filename as uploaded by the user, e.g., "attention-is-all-you-need.pdf".
    // We keep this for display purposes (showing the user what they originally uploaded).
    // It's NOT used for file storage (because multiple users might upload files with the same name).
    originalName: {
      type: String,
      required: true,
    },

    // --- fileSize ---
    // The file size in bytes, e.g., 1548276 (about 1.5MB).
    // Useful for display ("1.5 MB") and for enforcing storage quotas if needed.
    fileSize: {
      type: Number,
      required: true,
    },

    // --- userId ---
    // A reference to the User who uploaded this paper.
    //
    // type: mongoose.Schema.Types.ObjectId — this field stores a MongoDB ObjectId
    //   (the same type as the _id field on every document).
    //
    // ref: 'User' — tells Mongoose "this ObjectId points to the User model."
    //   This enables populate() — a method that automatically replaces the ObjectId
    //   with the full User document when querying.
    //   Example:
    //     Without populate: paper.userId = "6a4ba8ac9ae3f7857325b58f"
    //     With populate:    paper.userId = { _id: "6a4ba8ac", name: "Abhinav", email: "a@b.com" }
    //
    // required: true — every paper MUST belong to a user.
    //
    // index: true — creates a MongoDB index on this field, making queries like
    //   Paper.find({ userId: "..." }) much faster. Without an index, MongoDB would
    //   scan every document in the collection (slow for thousands of papers).
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    // timestamps: true — automatically adds createdAt and updatedAt fields.
    timestamps: true,
  }
);

// Compile the schema into a Model.
// This creates the "papers" collection in MongoDB and returns a class
// we can use for CRUD operations:
//   Paper.create({...})            → insert a new paper
//   Paper.find({ userId: "..." })  → find all papers for a user
//   Paper.findById(id)             → find one paper by _id
//   Paper.findByIdAndDelete(id)    → delete a paper by _id
const Paper = mongoose.model('Paper', paperSchema);

export default Paper;
