import axios from 'axios';
import { tryOfflineMock } from './offlineApi';

// Utility function to get CSRF token from cookies
export const getCSRFToken = () => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null; // Return null if CSRF token is not found
};

// Initialize Axios instance
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api', // Use environment variable or default to localhost
  withCredentials: true, // Include cookies with requests
});

console.log('API base URL:', axiosInstance.defaults.baseURL);

// Add an interceptor to dynamically fetch and attach the CSRF token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken; // Dynamically add CSRF token to headers
    } else {
      console.error('CSRF token not found. Ensure the backend sets the csrftoken cookie.');
    }
    return config;
  },
  (error) => {
    console.error('Error during request setup:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle API errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const fallbackEnabled =
      process.env.REACT_APP_ENABLE_OFFLINE_FALLBACK === '1' ||
      (process.env.REACT_APP_ENABLE_OFFLINE_FALLBACK !== '0' && process.env.NODE_ENV !== 'production');
    if (fallbackEnabled && error?.config && !error.response) {
      const mockResponse = tryOfflineMock(error.config, axiosInstance.defaults.baseURL);
      if (mockResponse) {
        console.warn(`Offline fallback served: ${error.config.method?.toUpperCase()} ${error.config.url}`);
        return Promise.resolve(mockResponse);
      }
    }

    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from API:', error.request);
    } else {
      console.error('Error setting up the request:', error.message);
    }
    return Promise.reject(error);
  }
);

// Log a warning during initialization if CSRF token is missing
if (!getCSRFToken()) {
  console.error('CSRF token not found during initialization. This might cause issues with POST/PUT requests.');
}

export default axiosInstance;
