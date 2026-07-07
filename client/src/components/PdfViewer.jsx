// ============================================
// PDF Viewer Component
// ============================================
// A simple wrapper around an iframe to display PDF files using the
// browser's native PDF viewer.
//
// CONCEPTS:
//
// 1. <iframe>:
//    The HTML inline frame element allows us to embed another document
//    within the current HTML document. By pointing its src attribute to
//    a PDF file, the browser automatically loads its internal PDF viewer
//    (which has built-in support for zooming, scrolling, and printing).
//
// 2. URL Construction:
//    We receive the `fileName` (e.g., "17192839481.pdf") from the database.
//    We need to construct the full URL to where the Express backend serves
//    these static files. Our backend is running on port 5001, and we configured
//    `app.use('/uploads', express.static(...))` in Phase 4.
//    So the URL is: http://localhost:5001/uploads/{fileName}

import React from 'react';

function PdfViewer({ fileName }) {
  // Construct the full URL to the PDF file served by the backend
  const fileUrl = `http://localhost:5001/uploads/${fileName}`;

  return (
    <div className="pdf-viewer-container">
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0`} // Basic parameters to hide default toolbar if possible (browser dependent)
        title="PDF Viewer"
        className="pdf-viewer-iframe"
      />
    </div>
  );
}

export default PdfViewer;
