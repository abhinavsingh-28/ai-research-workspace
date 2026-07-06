// ============================================
// Multer Upload Configuration
// ============================================
// Multer is Express middleware for handling multipart/form-data,
// which is the encoding used for file uploads.
//
// This file configures three things:
//   1. WHERE to save files (disk storage in uploads/ folder)
//   2. HOW to name files (timestamp + original name for uniqueness)
//   3. WHAT to accept (only PDFs, max 20MB)

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Recreate __dirname for ES modules (same pattern as index.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Storage Configuration
// ============================================
// multer.diskStorage() tells Multer to save files to disk (as opposed to
// multer.memoryStorage() which holds files in RAM — bad for large PDFs).
//
// It takes two functions:
//   - destination: WHICH folder to save to
//   - filename: WHAT to name the file
const storage = multer.diskStorage({
  // destination(req, file, cb)
  //   req   — the Express request object
  //   file  — an object with info about the uploaded file (originalname, mimetype, etc.)
  //   cb    — a callback. Call cb(error, folderPath).
  //           First arg is an error (null means no error).
  //           Second arg is the folder to save into.
  destination: function (req, file, cb) {
    // path.join(__dirname, '../../uploads') resolves to the uploads/ folder
    // at the project root. __dirname is server/config/, so:
    //   server/config/ + ../../uploads = uploads/
    cb(null, path.join(__dirname, '../../uploads'));
  },

  // filename(req, file, cb)
  //   We create a unique filename by prepending a timestamp.
  //   Without this, if two users upload "paper.pdf", the second would
  //   overwrite the first. With timestamps:
  //     1720000000000-paper.pdf
  //     1720000001000-paper.pdf  (different timestamps = different files)
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

// ============================================
// File Filter — Only Accept PDFs
// ============================================
// This function runs for EVERY uploaded file. It decides whether to
// accept or reject the file based on its MIME type.
//
// MIME type (Multipurpose Internet Mail Extensions) is a string like
// "application/pdf" or "image/png" that identifies the file format.
// The browser sets this based on the file extension.
//
// fileFilter(req, file, cb)
//   cb(null, true)  → accept the file
//   cb(error, false) → reject the file
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    // This is a PDF — accept it
    cb(null, true);
  } else {
    // Not a PDF — reject with an error message
    // This error will be caught by our route's error handling
    cb(new Error('Only PDF files are allowed.'), false);
  }
};

// ============================================
// Create the Multer Instance
// ============================================
// Combine storage, filter, and limits into one configured upload handler.
//
// limits.fileSize — maximum file size in bytes.
//   20 * 1024 * 1024 = 20MB (20 megabytes × 1024 kilobytes × 1024 bytes)
//   If a file exceeds this, Multer stops the upload and throws an error.
//   Why 20MB? Most research papers are 1-10MB. 20MB gives headroom
//   for papers with lots of images/figures.
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

// Export the configured multer instance.
// In routes, we'll use it like:
//   upload.single('file')  → expect ONE file in a form field named "file"
export default upload;
