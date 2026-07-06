// ============================================
// Paper Routes — Upload, List, Get, Delete
// ============================================
// These routes handle research paper management.
// ALL routes require authentication — the auth middleware verifies
// the JWT token and attaches req.user.userId before any handler runs.
//
// POST   /api/papers      → Upload a new paper (PDF file + optional title)
// GET    /api/papers      → List all papers for the logged-in user
// GET    /api/papers/:id  → Get one paper's metadata by its ID
// DELETE /api/papers/:id  → Delete a paper (removes file from disk + DB record)

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import auth from '../middleware/auth.js';
import upload from '../config/upload.js';
import Paper from '../models/Paper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// ============================================
// POST / — Upload a Paper
// ============================================
// This route uses TWO middleware functions before the handler:
//   1. auth     → verifies JWT, attaches req.user.userId
//   2. upload.single('file') → processes the file upload, attaches req.file
//
// upload.single('file') means:
//   - Expect ONE file (not multiple)
//   - The file must be in a form field named "file"
//   - After processing, req.file contains the file metadata
//
// The request body should be multipart/form-data with:
//   - file: the PDF file (required)
//   - title: the paper title (optional — defaults to the original filename)
//
// NOTE: We wrap upload.single('file') manually inside the route handler
// instead of chaining it as middleware (upload.single('file'), handler).
// Why? Because when Multer's file filter rejects a file, it throws an error
// that bypasses our try/catch. By wrapping it, we can catch Multer errors
// and return clean JSON instead of Express's ugly default HTML error page.
router.post('/', auth, async (req, res) => {
  // Wrap Multer in a promise so we can await it and catch errors
  try {
    await new Promise((resolve, reject) => {
      upload.single('file')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (multerError) {
    // Multer errors include: file too large, wrong file type, etc.
    return res.status(400).json({ message: multerError.message });
  }

  try {
    // ---- Check if a file was uploaded ----
    // If the client sends a request without a file, or the file was rejected
    // by the file filter (not a PDF), req.file will be undefined.
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file.' });
    }

    // ---- Determine the title ----
    // If the user provided a title in the form data, use it.
    // Otherwise, fall back to the original filename without the .pdf extension.
    //
    // path.parse('attention-is-all-you-need.pdf').name → 'attention-is-all-you-need'
    // This strips the .pdf extension to create a cleaner default title.
    const title = req.body.title || path.parse(req.file.originalname).name;

    // ---- Create the paper record in MongoDB ----
    // Paper.create() inserts a new document into the "papers" collection.
    // We store metadata about the file, NOT the file itself (that's on disk).
    const paper = await Paper.create({
      title,
      fileName: req.file.filename,       // The unique name on disk (e.g., "1720000000-attention.pdf")
      originalName: req.file.originalname, // The original upload name (e.g., "attention.pdf")
      fileSize: req.file.size,             // Size in bytes
      userId: req.user.userId,             // The authenticated user's ID (from auth middleware)
    });

    // ---- Return the created paper ----
    // Status 201 = "Created" — a new resource was successfully created.
    res.status(201).json({
      paper: {
        id: paper._id,
        title: paper.title,
        fileName: paper.fileName,
        originalName: paper.originalName,
        fileSize: paper.fileSize,
        createdAt: paper.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ message: 'Server error during file upload.' });
  }
});

// ============================================
// GET / — List All Papers for the Logged-In User
// ============================================
// Returns ONLY papers belonging to the authenticated user.
// We filter by userId to ensure data isolation — User A cannot see User B's papers.
//
// The .sort({ createdAt: -1 }) orders papers by newest first.
//   -1 = descending (newest first)
//    1 = ascending (oldest first)
router.get('/', auth, async (req, res) => {
  try {
    // Paper.find({ userId }) returns all documents in the "papers" collection
    // where the userId field matches the logged-in user's ID.
    //
    // .sort({ createdAt: -1 }) sorts the results by creation date, newest first.
    //
    // .select() specifies which fields to include in the results.
    // This is optional but good practice — don't send more data than the client needs.
    const papers = await Paper.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('title fileName originalName fileSize createdAt');

    res.json({ papers });
  } catch (error) {
    console.error('List papers error:', error.message);
    res.status(500).json({ message: 'Server error fetching papers.' });
  }
});

// ============================================
// GET /:id — Get One Paper by ID
// ============================================
// req.params.id is the :id from the URL.
// For example, GET /api/papers/6a4ba8ac9ae3f7857325b58f
//   → req.params.id = "6a4ba8ac9ae3f7857325b58f"
//
// We verify that the paper belongs to the requesting user.
// Without this check, any authenticated user could view any paper by guessing IDs.
router.get('/:id', auth, async (req, res) => {
  try {
    // Paper.findById() searches by the document's _id field.
    const paper = await Paper.findById(req.params.id);

    // ---- Check if paper exists ----
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found.' });
    }

    // ---- Check ownership ----
    // paper.userId is an ObjectId, req.user.userId is a string.
    // .toString() converts the ObjectId to a string for comparison.
    // Without .toString(), the comparison would always be false because
    // JavaScript compares objects by reference, not by value.
    if (paper.userId.toString() !== req.user.userId) {
      // 403 Forbidden — the user IS authenticated but doesn't have
      // permission to access this specific resource.
      // (401 = "who are you?", 403 = "I know who you are, but you can't do this")
      return res.status(403).json({ message: 'Not authorized to access this paper.' });
    }

    res.json({
      paper: {
        id: paper._id,
        title: paper.title,
        fileName: paper.fileName,
        originalName: paper.originalName,
        fileSize: paper.fileSize,
        createdAt: paper.createdAt,
      },
    });
  } catch (error) {
    console.error('Get paper error:', error.message);
    res.status(500).json({ message: 'Server error fetching paper.' });
  }
});

// ============================================
// DELETE /:id — Delete a Paper
// ============================================
// This does TWO things:
//   1. Deletes the PDF FILE from the uploads/ folder (fs.unlink)
//   2. Deletes the METADATA from MongoDB (Paper.findByIdAndDelete)
//
// We must delete the file first, then the DB record.
// If we deleted the DB record first and the file deletion failed,
// we'd have an orphaned file on disk with no way to find it.
router.delete('/:id', auth, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({ message: 'Paper not found.' });
    }

    // ---- Check ownership ----
    if (paper.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this paper.' });
    }

    // ---- Delete the file from disk ----
    // Construct the full path to the file.
    // __dirname is server/routes/, so:
    //   server/routes/ + ../../uploads/ + filename = uploads/filename
    const filePath = path.join(__dirname, '../../uploads', paper.fileName);

    try {
      // fs.unlink() deletes a file. It's from the 'fs/promises' module,
      // so we can use await. If the file doesn't exist, it throws an error.
      await fs.unlink(filePath);
    } catch (unlinkError) {
      // If the file is already gone (maybe manually deleted), log it but
      // continue — we still want to remove the DB record.
      console.warn(`File not found on disk: ${paper.fileName}`);
    }

    // ---- Delete the metadata from MongoDB ----
    // Paper.findByIdAndDelete() finds the document by _id and removes it
    // from the collection in one atomic operation.
    await Paper.findByIdAndDelete(req.params.id);

    res.json({ message: 'Paper deleted successfully.' });
  } catch (error) {
    console.error('Delete paper error:', error.message);
    res.status(500).json({ message: 'Server error deleting paper.' });
  }
});

export default router;
