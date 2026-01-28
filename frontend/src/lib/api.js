import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors - but don't redirect automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only remove token if we get a 401 on a protected route
    // Don't redirect - let the auth context handle that
    if (error.response?.status === 401) {
      // Check if this is NOT a login/register request
      const isAuthRequest = error.config?.url?.includes('/auth/');
      if (!isAuthRequest) {
        // Token is invalid/expired - clear it
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

// Helper to get full image URL from relative path
export const getImageUrl = (path) => {
  if (!path) return null;
  // If it's already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Otherwise, prepend the backend URL
  return `${BACKEND_URL}${path}`;
};

export default api;
