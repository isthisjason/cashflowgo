import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from './axiosConfig'; // Ensure you have axiosConfig.js in src/

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null means loading

  const checkAuth = async () => {
    try {
      const response = await axios.get('/accounts/check-authentication/');
      setIsAuthenticated(Boolean(response.data?.is_authenticated));
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Authentication check failed:', error);
      }
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
