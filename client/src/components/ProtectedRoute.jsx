// ============================================
// Protected Route — Auth Guard Component
// ============================================
// This component wraps routes that require authentication.
// If the user is NOT logged in, it redirects them to /login.
// If they ARE logged in, it renders the child component normally.
//
// Usage in App.jsx:
//   <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
//
// CONCEPT: React Router's <Navigate> component
// <Navigate to="/login" /> is React Router's way of doing a redirect.
// It doesn't render anything visible — it just changes the URL.
// 'replace' means it replaces the current history entry instead of
// pushing a new one, so clicking "back" doesn't take you to the
// protected page (which would just redirect again — infinite loop).

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // While checking if the stored token is valid, show a loading state.
  // Without this, there would be a brief flash of the login page
  // on every refresh before the auth check completes.
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--text-muted)',
      }}>
        Loading...
      </div>
    );
  }

  // If not authenticated, redirect to login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child component (e.g., DashboardPage).
  return children;
}

export default ProtectedRoute;
