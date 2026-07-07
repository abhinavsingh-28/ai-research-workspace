// ============================================
// Dashboard Page — Paper Management
// ============================================
// This is the main page after login. It acts as the "container" component:
//   - Fetches papers from the API
//   - Manages state (papers list, selected paper, modal visibility)
//   - Passes data and callbacks to child components (Sidebar, UploadModal)
//
// CONCEPT: Container vs Presentational Components
//
// Container components (this file):
//   - Manage state and side effects (API calls, localStorage)
//   - Pass data down to presentational components via props
//   - Handle business logic (what happens when a paper is deleted?)
//
// Presentational components (Sidebar, UploadModal):
//   - Receive data via props
//   - Render UI
//   - Report user actions via callback props (onDeletePaper, onSelectPaper)
//   - Don't make API calls or manage complex state
//
// This separation keeps each component focused and easier to understand.
//
// CONCEPT: useEffect for Data Fetching
//
// useEffect(fn, []) runs ONCE when the component mounts (first renders).
// We use it to fetch the user's papers from the API when the dashboard loads.
// The empty dependency array [] means "run this effect only once."
// If we omitted the array, it would run on EVERY render (infinite loop!).

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client.js';
import Sidebar from '../components/Sidebar.jsx';
import UploadModal from '../components/UploadModal.jsx';
import PdfViewer from '../components/PdfViewer.jsx';

function DashboardPage() {
  // ---- State ----
  const [papers, setPapers] = useState([]);               // Array of paper objects from API
  const [selectedPaper, setSelectedPaper] = useState(null); // Currently selected paper
  const [showUploadModal, setShowUploadModal] = useState(false); // Modal visibility
  const [isLoadingPapers, setIsLoadingPapers] = useState(true);  // Loading state for initial fetch

  // ---- Fetch Papers from API ----
  // useCallback wraps a function so it's not recreated on every render.
  // This matters because fetchPapers is used in useEffect's dependency array.
  // Without useCallback, a new function reference would be created each render,
  // causing useEffect to re-run infinitely.
  //
  // useCallback(fn, []) → "create this function once and reuse it"
  const fetchPapers = useCallback(async () => {
    try {
      const response = await api.get('/papers');
      setPapers(response.data.papers);
    } catch (err) {
      console.error('Failed to fetch papers:', err.message);
    } finally {
      setIsLoadingPapers(false);
    }
  }, []);

  // Fetch papers when the component first mounts.
  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // ---- Handlers ----

  // Called when a paper in the sidebar is clicked.
  const handleSelectPaper = (paper) => {
    setSelectedPaper(paper);
  };

  // Called when upload succeeds — re-fetch the paper list to include the new paper.
  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    fetchPapers(); // Re-fetch to get the updated list from the server
  };

  // Called when a paper's delete button is clicked.
  // Makes a DELETE request, then removes the paper from local state.
  //
  // We update state OPTIMISTICALLY — remove from the UI immediately,
  // without waiting for a full re-fetch. This makes the UI feel faster.
  //
  // setPapers(prev => prev.filter(p => p._id !== paperId))
  //   This is a "functional update" — we pass a function to setPapers
  //   that receives the previous state and returns the new state.
  //   .filter() creates a new array without the deleted paper.
  const handleDeletePaper = async (paperId) => {
    try {
      await api.delete(`/papers/${paperId}`);

      // Remove from local state (no need to re-fetch everything)
      setPapers((prev) => prev.filter((p) => p._id !== paperId));

      // If the deleted paper was selected, clear the selection
      if (selectedPaper?._id === paperId) {
        setSelectedPaper(null);
      }
    } catch (err) {
      console.error('Failed to delete paper:', err.message);
      alert('Failed to delete paper. Please try again.');
    }
  };

  // ---- Render ----
  return (
    <div className="app-layout">
      {/* Sidebar — receives all paper data and callbacks as props */}
      <Sidebar
        papers={papers}
        selectedPaperId={selectedPaper?._id}
        onSelectPaper={handleSelectPaper}
        onDeletePaper={handleDeletePaper}
        onUploadClick={() => setShowUploadModal(true)}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {isLoadingPapers ? (
          // Loading state while fetching papers
          <div className="main-empty">
            <p className="main-empty__text">Loading papers...</p>
          </div>
        ) : selectedPaper ? (
          // A paper is selected — show its info (PDF viewer comes in Phase 7)
          <div className="main-paper-info">
            <div className="main-paper-info__header">
              <h1 className="main-paper-info__title">{selectedPaper.title}</h1>
              <p className="main-paper-info__meta">
                {selectedPaper.originalName} · Uploaded {new Date(selectedPaper.createdAt).toLocaleDateString()}
              </p>
            </div>
            {/* PDF Viewer */}
            <PdfViewer fileName={selectedPaper.fileName} />
          </div>
        ) : (
          // No paper selected — show empty state
          <div className="main-empty">
            <span className="main-empty__icon">📚</span>
            <h2 className="main-empty__title">
              {papers.length === 0
                ? 'Upload your first paper'
                : 'Select a paper to view'}
            </h2>
            <p className="main-empty__text">
              {papers.length === 0
                ? 'Click "Upload Paper" in the sidebar to get started'
                : 'Choose a paper from the sidebar to read and explore'}
            </p>
          </div>
        )}
      </main>

      {/* Upload Modal — only rendered when showUploadModal is true.
          This is conditional rendering: {condition && <Component />}
          If condition is false, React renders nothing. */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}

export default DashboardPage;
