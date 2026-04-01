import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axiosConfig';
import './Signup.css'; // Use a dedicated Signup.css file

function Signup() {
  const [username, setUsername] = useState(''); // New username state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSuccess('');
      return;
    }

    try {
      const response = await axios.post('/accounts/signup/', {
        username, // Include username in the request
        email,
        password,
      });
      setSuccess('Account created successfully! Redirecting to login...');
      setError('');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
      setSuccess('');
    }
  };

  return (
    <div className="signup-container">
      <h1>Sign Up</h1>
      <input
        type="text"
        placeholder="Username" // Input field for username
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="signup-input"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="signup-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="signup-input"
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="signup-input"
      />
      {error && <p className="signup-error">{error}</p>}
      {success && <p className="signup-success">{success}</p>}
      <button onClick={handleSignup} className="signup-button">Sign Up</button>
    </div>
  );
}

export default Signup;