// ============================================
// Login Page
// ============================================
// A form that collects email + password, calls the auth context's
// login function, and redirects to the dashboard on success.
//
// CONCEPTS:
// - useState() for form fields and UI state (error, loading)
// - Form submission with e.preventDefault() (prevent page reload)
// - try/catch for async error handling
// - useNavigate() for programmatic navigation (redirect after login)
// - Link component for client-side navigation (no full page reload)

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  // ---- State ----
  // Each form field gets its own state variable.
  // When the user types, we update the state, which updates the input value.
  // This is called a "controlled component" — React controls the input's value.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ---- Hooks ----
  // useAuth() — our custom hook that provides login, user, etc.
  // useNavigate() — React Router hook that returns a function to change the URL.
  const { login } = useAuth();
  const navigate = useNavigate();

  // ---- Form Submission Handler ----
  // This runs when the user clicks "Log In" or presses Enter in the form.
  const handleSubmit = async (e) => {
    // e.preventDefault() stops the browser's default form behavior,
    // which is to reload the page and send a GET request with form data
    // in the URL (like ?email=a@b.com&password=secret). We don't want that —
    // we want to handle submission ourselves with JavaScript.
    e.preventDefault();

    // Clear any previous error message
    setError('');
    setIsLoading(true);

    try {
      // Call the login function from AuthContext.
      // This makes the API call, stores the token, and updates the state.
      await login(email, password);

      // If login succeeds (no error thrown), navigate to the dashboard.
      // '/' is the dashboard route.
      navigate('/');
    } catch (err) {
      // If login fails, the backend sends an error response.
      // Axios wraps it in err.response.data.
      // err.response?.data?.message safely accesses nested properties.
      // The ?. (optional chaining) prevents crashes if response is undefined
      // (e.g., network error where the server is unreachable).
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      // 'finally' runs whether the try succeeded or the catch ran.
      // We always want to stop the loading spinner.
      setIsLoading(false);
    }
  };

  // ---- JSX (the rendered UI) ----
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Log in to your research workspace</p>

        {/* Conditional rendering: only show error if it's not empty */}
        {error && <div className="error-message">{error}</div>}

        {/* onSubmit runs handleSubmit when the form is submitted */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            {/* htmlFor links the label to the input — clicking the label focuses the input.
                Uses htmlFor instead of HTML's 'for' because 'for' is a reserved word in JavaScript. */}
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {/* Show different text while loading */}
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          {/* Link is React Router's replacement for <a> tags.
              It navigates without a full page reload (SPA behavior). */}
          <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
