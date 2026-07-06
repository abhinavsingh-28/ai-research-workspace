// ============================================
// Auth Context — Shared Authentication State
// ============================================
// CONCEPT: React Context
//
// Problem: Multiple components need access to the same data (is the user
// logged in? what's their name?). Without Context, you'd have to pass
// this data through props at every level of the component tree:
//
//   App → Layout → Sidebar → UserMenu → user prop needed here!
//
// This is called "prop drilling" — tedious and error-prone.
//
// Solution: Context creates a "global" state that any component can
// access directly, no matter how deep it is in the tree.
//
//   <AuthProvider>        ← Wraps the entire app, holds the state
//     <App>
//       <Layout>
//         <Sidebar>
//           <UserMenu>    ← useAuth() directly accesses user, no prop drilling
//
// How it works:
//   1. createContext() — creates a Context object
//   2. AuthProvider — a component that holds state and provides it via Context
//   3. useAuth() — a custom hook that reads from the Context

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

// ---- Step 1: Create the Context ----
// createContext() creates a Context object. This object has two parts:
//   - AuthContext.Provider — a component that "provides" data to its children
//   - AuthContext (the object itself) — used by useContext() to read the data
//
// null is the default value (used if a component tries to read the context
// without being wrapped in a Provider — shouldn't happen in our app).
const AuthContext = createContext(null);

// ---- Step 2: Create the Provider Component ----
// This component wraps the entire app. It:
//   1. Holds the auth state (user, token, loading)
//   2. Provides login, signup, and logout functions
//   3. Passes everything to children via Context
//
// 'children' is a special React prop — it represents whatever is
// between <AuthProvider> and </AuthProvider> tags.
export function AuthProvider({ children }) {
  // ---- State ----
  // useState() creates a state variable that triggers re-renders when changed.
  //
  // user: the currently logged-in user object, or null if not logged in.
  // We initialize from localStorage so the user stays logged in after page refresh.
  //
  // JSON.parse() converts the stored string back to an object:
  //   '{"id":"668abc","name":"Abhinav","email":"a@b.com"}' → { id, name, email }
  // If nothing is stored, localStorage.getItem returns null, and JSON.parse(null) returns null.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // token: the JWT string, or null. Also initialized from localStorage.
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  // loading: true while we're checking if the stored token is still valid.
  // This prevents a flash of the login page on refresh.
  const [loading, setLoading] = useState(true);

  // ---- useEffect: Check Token on Mount ----
  // useEffect(fn, []) — runs ONCE when the component first mounts.
  //
  // When the app loads, we check if there's a stored token. If yes,
  // we verify it's still valid by making a request to the health endpoint.
  // If the token is expired, the 401 response interceptor in api/client.js
  // will clear localStorage and redirect to login.
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        // A simple request to verify the token is still valid.
        // If it's expired, the interceptor handles logout.
        await api.get('/health');
        setLoading(false);
      } catch {
        // Token is invalid — clear everything
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ---- Login Function ----
  // Called from the LoginPage component.
  // Makes a POST request to the backend, then stores the response.
  const login = async (email, password) => {
    // api.post() uses our configured axios instance.
    // It automatically includes the Content-Type: application/json header.
    const response = await api.post('/auth/login', { email, password });
    const { user: userData, token: newToken } = response.data;

    // Store in localStorage for persistence across page refreshes.
    // localStorage only stores strings, so we JSON.stringify the user object.
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    // Update React state — this triggers a re-render of all components
    // that use this context, updating the UI instantly.
    setToken(newToken);
    setUser(userData);
  };

  // ---- Signup Function ----
  // Same pattern as login, but calls the signup endpoint.
  const signup = async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    const { user: userData, token: newToken } = response.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
  };

  // ---- Logout Function ----
  // Clears everything — token, user, localStorage.
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // ---- Provide the Context Value ----
  // AuthContext.Provider wraps the children and makes this value object
  // available to any component that calls useAuth().
  //
  // Every time user, token, or loading changes, all consumers re-render
  // with the new values.
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!token, // Convert token to boolean (null → false, string → true)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---- Step 3: Create the Custom Hook ----
// This is a convenience wrapper around useContext(AuthContext).
// Instead of importing both AuthContext and useContext in every component,
// they just import useAuth:
//
//   import { useAuth } from '../context/AuthContext';
//   const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);

  // Safety check — if someone uses useAuth() outside an AuthProvider,
  // throw a helpful error instead of getting "cannot read property of null".
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
