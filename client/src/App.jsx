// ============================================
// App — Root Component with Routing
// ============================================
// This is the top-level component. It sets up:
//   1. AuthProvider — wraps everything so auth state is available everywhere
//   2. BrowserRouter — enables client-side routing (URL changes without page reload)
//   3. Routes — maps URL paths to page components
//
// CONCEPT: React Router
// In a traditional website, clicking a link sends a request to the server,
// which returns a new HTML page. This causes a full page reload (slow, flickers).
//
// React Router intercepts link clicks and:
//   1. Updates the URL in the address bar (using the History API)
//   2. Renders the matching component — no page reload, no server request
//   3. The user sees an instant transition
//
// This is what makes React a "Single-Page Application" (SPA) —
// the browser loads ONE HTML page, and React Router handles navigation
// by swapping components in and out.
//
// Key components:
//   <BrowserRouter> — wraps the app, provides routing context
//   <Routes>        — container for all route definitions
//   <Route>         — maps a path to a component
//   <Navigate>      — redirects to a different path

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

function App() {
  return (
    // AuthProvider must wrap BrowserRouter (or be at the same level)
    // so that auth state is available to all route components.
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ---- Public Routes ---- */}
          {/* These pages are accessible without logging in */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ---- Protected Routes ---- */}
          {/* ProtectedRoute checks if the user is authenticated.
              If yes → renders DashboardPage.
              If no  → redirects to /login. */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* ---- Catch-All Route ---- */}
          {/* If the user navigates to a URL that doesn't match any route
              (e.g., /random-page), redirect them to the dashboard.
              The "*" path matches everything that isn't matched above. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
