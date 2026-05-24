import axios from 'axios';
import { tryOfflineMock } from './offlineApi';

let csrfTokenCache = null;

const cacheCSRFToken = (token) => {
  if (token) {
    csrfTokenCache = token;
  }
};

// Utility function to get CSRF token from cookies when the browser exposes it.
export const getCSRFToken = () => {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      csrfTokenCache = cookie.substring(name.length + 1);
      return csrfTokenCache;
    }
  }
  return null;
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
      config.headers['X-CSRFToken'] = csrfToken;
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
  (response) => {
    cacheCSRFToken(response.data?.csrf_token);
    return response;
  },
  (error) => {
    const fallbackEnabled = process.env.REACT_APP_ENABLE_OFFLINE_FALLBACK === '1';
    if (fallbackEnabled && error?.config && !error.response) {
      const mockResponse = tryOfflineMock(error.config, axiosInstance.defaults.baseURL);
      if (mockResponse) {
        console.warn(`Offline fallback served: ${error.config.method?.toUpperCase()} ${error.config.url}`);
        return Promise.resolve(mockResponse);
      }
    }

    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Response data:', error.response.data);
      }
    } else if (error.request) {
      console.error('No response received from API:', error.request);
    } else {
      console.error('Error setting up the request:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
