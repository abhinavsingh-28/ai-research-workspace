// ============================================
// API Client — Centralized Axios Instance
// ============================================
// This module creates a pre-configured Axios instance that:
//   1. Points all requests to our backend (http://localhost:5001/api)
//   2. Automatically attaches the JWT token to every request
//   3. Handles 401 errors (expired/invalid token) by logging out
//
// Instead of writing this every time:
//   axios.get('http://localhost:5001/api/papers', {
//     headers: { Authorization: 'Bearer ' + token }
//   })
//
// We can just write:
//   api.get('/papers')   ← base URL and auth header are auto-added
//
// CONCEPT: Axios Interceptors
// Interceptors are functions that run on EVERY request or response.
//   - Request interceptor: runs BEFORE the request is sent
//     (we use it to attach the JWT token)
//   - Response interceptor: runs AFTER a response is received
//     (we use it to handle 401 errors globally)

import axios from 'axios';

// Create a custom Axios instance with our base URL.
// All requests made through 'api' will be relative to this URL:
//   api.get('/papers')  →  GET http://localhost:5001/api/papers
//   api.post('/auth/login', data)  →  POST http://localhost:5001/api/auth/login
const api = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// ============================================
// Request Interceptor — Attach JWT Token
// ============================================
// This runs BEFORE every request. It reads the JWT token from
// localStorage and adds it to the Authorization header.
//
// Why localStorage?
// When the user logs in, we store their JWT token in localStorage
// (a browser API that persists data even after the tab is closed).
// On every subsequent request, we read it back and attach it.
//
// The interceptor receives the request config object, adds the header,
// and returns the modified config. Axios then sends the request with
// this config.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set the Authorization header in the format the backend expects:
      //   Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // If something goes wrong building the request, reject the promise.
    return Promise.reject(error);
  }
);

// ============================================
// Response Interceptor — Handle 401 Errors
// ============================================
// This runs AFTER every response. If the server returns 401
// (Unauthorized — meaning the token is expired or invalid),
// we automatically clear the stored token and redirect to login.
//
// This prevents the user from staying on a protected page with
// an invalid session — they'll be sent back to login immediately.
api.interceptors.response.use(
  (response) => {
    // If the response is successful (2xx), just pass it through.
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is expired or invalid — clear everything
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login page (only if not already there)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Re-throw the error so the calling code can handle it too
    return Promise.reject(error);
  }
);

export default api;
