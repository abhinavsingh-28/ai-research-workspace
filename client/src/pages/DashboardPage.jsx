// ============================================
// Dashboard Page — Placeholder
// ============================================
// This is the main page users see after logging in.
// For now it's a simple placeholder. In Phase 6, we'll add
// the paper list and upload functionality here.

import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* ---- Sidebar ---- */}
      <aside className="app-sidebar">
        <div style={{
          padding: 'var(--space-lg)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--bg-accent), #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            AI Research
          </h2>
        </div>

        {/* Spacer pushes user info to bottom */}
        <div style={{ flex: 1 }} />

        {/* User info + logout at bottom of sidebar */}
        <div style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderTop: '1px solid var(--border-color)',
        }}>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-sm)',
          }}>
            Signed in as
          </p>
          <p style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: 'var(--space-md)',
          }}>
            {user?.name}
          </p>
          <button
            className="btn-ghost"
            onClick={handleLogout}
            style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="app-main">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          color: 'var(--text-muted)',
        }}>
          <span style={{ fontSize: '3rem' }}>📚</span>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Welcome, {user?.name}!
          </h2>
          <p>Your research papers will appear here.</p>
          <p style={{ fontSize: '0.8rem' }}>
            Paper upload coming in Phase 6
          </p>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
