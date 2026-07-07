// ============================================
// Sidebar Component — Paper Navigator
// ============================================
// The left sidebar of the app, containing:
//   1. App title/branding
//   2. "Upload Paper" button
//   3. List of the user's papers (from the API)
//   4. User info + logout at the bottom
//
// CONCEPTS:
//
// 1. Props:
//    This component receives its data and callbacks as props from DashboardPage:
//      papers          — the array of paper objects to display
//      selectedPaperId — which paper is currently selected (highlighted)
//      onSelectPaper   — callback when a paper is clicked
//      onDeletePaper   — callback when a paper's delete button is clicked
//      onUploadClick   — callback when "Upload Paper" button is clicked
//
//    This makes Sidebar a "presentational" component — it displays data and
//    reports user actions, but doesn't manage state or make API calls itself.
//    DashboardPage (the "container") handles the state and API logic.
//
// 2. Conditional rendering:
//    {papers.length === 0 ? <EmptyState /> : <PaperList />}
//    Show different UI based on whether there are papers.
//
// 3. Date formatting:
//    new Date(dateString).toLocaleDateString() converts ISO date strings
//    like "2026-07-06T13:22:36.256Z" into locale-friendly format like "7/6/2026".

import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { formatFileSize } from '../utils/formatFileSize.js';

function Sidebar({ papers, selectedPaperId, onSelectPaper, onDeletePaper, onUploadClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Delete handler with confirmation dialog.
  // window.confirm() shows a native browser dialog with OK/Cancel buttons.
  // It returns true if the user clicks OK, false if they click Cancel.
  // e.stopPropagation() prevents the click from bubbling up to the
  // paper item's onClick (which would select the paper we're deleting).
  const handleDelete = (e, paperId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this paper?')) {
      onDeletePaper(paperId);
    }
  };

  return (
    <aside className="app-sidebar">
      {/* ---- Header: App Title + Upload Button ---- */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">AI Research</h2>
        <button className="btn-primary sidebar-upload-btn" onClick={onUploadClick}>
          + Upload Paper
        </button>
      </div>

      {/* ---- Paper List ---- */}
      <div className="sidebar-papers">
        {papers.length === 0 ? (
          // Empty state — shown when the user has no papers yet
          <div className="sidebar-empty">
            <span className="sidebar-empty__icon">📚</span>
            <p className="sidebar-empty__text">No papers yet</p>
            <p className="sidebar-empty__subtext">Upload your first research paper</p>
          </div>
        ) : (
          // Paper list — one item per paper
          papers.map((paper) => (
            <div
              key={paper._id}
              className={`sidebar-paper-item ${selectedPaperId === paper._id ? 'sidebar-paper-item--active' : ''}`}
              onClick={() => onSelectPaper(paper)}
            >
              <div className="sidebar-paper-item__content">
                <p className="sidebar-paper-item__title">{paper.title}</p>
                <p className="sidebar-paper-item__meta">
                  {formatFileSize(paper.fileSize)} · {new Date(paper.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                className="sidebar-paper-item__delete"
                onClick={(e) => handleDelete(e, paper._id)}
                title="Delete paper"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>

      {/* ---- User Info + Logout ---- */}
      <div className="sidebar-footer">
        <p className="sidebar-footer__label">Signed in as</p>
        <p className="sidebar-footer__name">{user?.name}</p>
        <button
          className="btn-ghost sidebar-logout-btn"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
