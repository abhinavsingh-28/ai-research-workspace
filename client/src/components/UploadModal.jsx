// ============================================
// Upload Modal — Drag-and-Drop PDF Upload
// ============================================
// A modal dialog that lets users upload research papers.
// Two ways to select a file:
//   1. Drag a PDF onto the drop zone
//   2. Click "Choose file" to open the OS file picker
//
// After selecting a file, the user can optionally set a title,
// then click "Upload" to send it to the server.
//
// CONCEPTS:
//
// 1. HTML Drag & Drop API:
//    The browser fires events when files are dragged over elements:
//      onDragOver  — fires continuously while something is dragged over the element
//      onDragLeave — fires when the dragged item leaves the element
//      onDrop      — fires when the item is dropped
//    We use these to create a "drop zone" that highlights when a file hovers over it.
//
// 2. FormData:
//    For file uploads, we can't use JSON (JSON can't carry binary data).
//    FormData is a browser API that creates multipart/form-data bodies:
//      const formData = new FormData();
//      formData.append('file', fileObject);   ← the PDF file
//      formData.append('title', 'My Paper');  ← text field
//    Axios detects FormData and automatically sets the correct Content-Type header.
//
// 3. useRef:
//    useRef creates a reference to a DOM element. We use it to programmatically
//    trigger the hidden <input type="file"> when the user clicks "Choose file".

import React, { useState, useRef } from 'react';
import { X, FileText, UploadCloud } from 'lucide-react';
import api from '../api/client.js';
import { formatFileSize } from '../utils/formatFileSize.js';

function UploadModal({ onClose, onUploadSuccess }) {
  // ---- State ----
  const [file, setFile] = useState(null);          // The selected PDF file object
  const [title, setTitle] = useState('');           // Optional custom title
  const [isDragging, setIsDragging] = useState(false); // Visual feedback for drag-over
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // useRef creates a reference to the hidden file input element.
  // We call fileInputRef.current.click() to open the file picker programmatically.
  const fileInputRef = useRef(null);

  // ---- Drag & Drop Handlers ----

  // onDragOver fires continuously while a file hovers over the drop zone.
  // We MUST call e.preventDefault() to tell the browser we want to handle
  // the drop ourselves (otherwise the browser would try to open the file).
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // onDragLeave fires when the dragged item leaves the drop zone.
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // onDrop fires when the user releases the file over the drop zone.
  // e.dataTransfer.files contains the dropped file(s).
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');

    // Get the first dropped file
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    // Validate: only accept PDFs
    if (droppedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }

    setFile(droppedFile);

    // Auto-fill the title from the filename (without .pdf extension)
    if (!title) {
      const nameWithoutExt = droppedFile.name.replace(/\.pdf$/i, '');
      setTitle(nameWithoutExt);
    }
  };

  // ---- File Input Handler (fallback for non-drag users) ----
  // This handles the <input type="file"> change event.
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);

    if (!title) {
      const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '');
      setTitle(nameWithoutExt);
    }
  };

  // ---- Upload Handler ----
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      // Create a FormData object — this is the browser's way of building
      // multipart/form-data request bodies (the encoding needed for file uploads).
      //
      // formData.append(fieldName, value):
      //   'file' must match what Multer expects: upload.single('file')
      //   'title' is a text field that goes into req.body.title on the server
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) {
        formData.append('title', title.trim());
      }

      // Axios automatically:
      //   1. Detects FormData and sets Content-Type: multipart/form-data
      //   2. Adds the Authorization header (via our request interceptor)
      const response = await api.post('/papers', formData);

      // Notify the parent component (DashboardPage) that upload succeeded.
      // This triggers a re-fetch of the paper list.
      onUploadSuccess(response.data.paper);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // ---- Render ----
  return (
    // Modal overlay — clicking it closes the modal
    <div className="modal-overlay" onClick={onClose}>
      {/* Modal dialog — clicking inside it should NOT close the modal.
          e.stopPropagation() prevents the click from reaching the overlay. */}
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Paper</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Drop Zone */}
        <div
          className={`drop-zone ${isDragging ? 'drop-zone--active' : ''} ${file ? 'drop-zone--has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            // File is selected — show file info
            <div className="drop-zone__file-info">
              <span className="drop-zone__icon"><FileText size={32} /></span>
              <p className="drop-zone__filename">{file.name}</p>
              <p className="drop-zone__filesize">{formatFileSize(file.size)}</p>
              <p className="drop-zone__change">Click or drag to change file</p>
            </div>
          ) : (
            // No file — show instructions
            <div className="drop-zone__placeholder">
              <span className="drop-zone__icon"><UploadCloud size={32} /></span>
              <p className="drop-zone__text">Drag & drop a PDF here</p>
              <p className="drop-zone__subtext">or click to choose a file</p>
            </div>
          )}

          {/* Hidden file input — triggered by clicking the drop zone.
              accept=".pdf" limits the file picker to only show PDF files. */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Title Input */}
        <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
          <label htmlFor="paper-title">Paper Title</label>
          <input
            id="paper-title"
            type="text"
            placeholder="e.g., Attention Is All You Need"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Upload Button */}
        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{ width: '100%', marginTop: 'var(--space-md)' }}
        >
          {isUploading ? 'Uploading...' : 'Upload Paper'}
        </button>
      </div>
    </div>
  );
}

export default UploadModal;
