import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TransactionsPage from './components/TransactionsPage';
import Login from './components/Login';
import Signup from './components/Signup';
import AddTransaction from './components/AddTransaction';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import SubscriptionManager from './components/SubscriptionManager';
import BudgetAlert from './components/BudgetAlert'; // Import the BudgetAlert component
import axios from './axiosConfig';
import './App.css';

function App() {
  const [profile, setProfile] = useState('personal'); // Ensure default matches backend expectations
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [showBudgetAlert, setShowBudgetAlert] = useState(false); // State to toggle BudgetAlert dropdown

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await axios.get('/accounts/csrf/');
        const authResponse = await axios.get('/accounts/check-authentication/');
        if (authResponse.data?.is_authenticated) {
          setIsAuthenticated(true);
          return;
        }
        setIsAuthenticated(false);
      } catch (error) {
        console.error('Error during auth bootstrap:', error.response?.data || error.message);
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        setIsAuthenticated(Boolean(loggedInUser));
      }
    };

    initializeAuth();
  }, []);

  const switchProfile = (newProfile) => {
    const normalizedProfile = newProfile.toLowerCase();
    console.log('Switching profile to:', normalizedProfile); // Debug log
    setProfile(normalizedProfile); // Normalize to match model choices
  };

  const toggleBudgetAlert = () => {
    console.log('Toggling BudgetAlert visibility'); // Debug log
    setShowBudgetAlert((prev) => !prev);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    console.log('User logged in'); // Debug log
  };

  const handleLogout = async () => {
    try {
      await axios.post('/accounts/logout/');
      console.log('Logout successful');
      localStorage.removeItem('loggedInUser');
      setIsAuthenticated(false);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error.response?.data || error.message);
    }
  };

  if (isAuthenticated === null) {
    console.log('Authentication status is loading...'); // Debug log
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        {isAuthenticated && (
          <Navbar
            profile={profile}
            switchProfile={switchProfile}
            onLogout={handleLogout}
            toggleBudgetAlert={toggleBudgetAlert} // Pass toggle function
          />
        )}
        <div className="dashboard-container">
          {showBudgetAlert && <BudgetAlert profile={profile} />} {/* Pass profile */}
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard
                    profile={profile}
                    setIsAuthenticated={setIsAuthenticated}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <TransactionsPage profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <SubscriptionManager profile={profile} /> {/* Pass profile as prop */}
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/" />
                ) : (
                  <Login
                    onLogin={() => {
                      handleLogin();
                    }}
                  />
                )
              }
            />
            <Route
              path="/signup"
              element={
                isAuthenticated ? (
                  <Navigate to="/" />
                ) : (
                  <Signup />
                )
              }
            />
            <Route
              path="/add-transaction"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AddTransaction profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/budget-alert"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <BudgetAlert profile={profile} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
