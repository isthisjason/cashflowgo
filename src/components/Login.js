import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axiosConfig'; // Use the centralized instance
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // Send login request to the backend
      const response = await axios.post('/accounts/login/', {
        email,
        password,
      });
      console.log('Login response:', response.data); // Debugging backend response

      // Save the user data to localStorage
      localStorage.setItem('loggedInUser', JSON.stringify(response.data.user));
      console.log('Logged in user saved:', localStorage.getItem('loggedInUser')); // Debugging localStorage

      // Save the CSRF token in cookies for future requests
      const csrfToken = response.data.csrf_token;
      if (csrfToken) {
        document.cookie = `csrftoken=${csrfToken}; path=/`;
        console.log('CSRF token set:', csrfToken); // Debugging CSRF token
      }

      // Call onLogin callback to update the app state
      if (onLogin) onLogin();

      // Navigate to home page after successful login
      console.log('Redirecting to dashboard'); // Debugging navigation
      navigate('/');
    } catch (err) {
      console.error('Login error:', err.response?.data || err); // Debugging error response
      if (!err.response) {
        setError('Cannot reach API server. Start backend at http://127.0.0.1:8000 and try again.');
      } else {
        setError(err.response?.data?.error || 'Login failed. Check credentials and try again.');
      }
    }
  };

  const handleSignupRedirect = () => {
    console.log('Redirecting to signup'); // Debugging
    navigate('/signup'); // Navigate to signup page
  };

  return (
    <div className="login-container">
      <h1 className="app-title">CashFlowGo</h1>
      <div className="login-box">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />
        {error && <p className="login-error">{error}</p>}
        <button onClick={handleLogin} className="button">Login</button>
        <button onClick={handleSignupRedirect} className="button">Sign Up</button>
      </div>
    </div>
  );
}

export default Login;
