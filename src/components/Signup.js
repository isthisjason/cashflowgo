import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axiosConfig';
import './Signup.css';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSuccess('');
      return;
    }

    try {
      await axios.post('/accounts/signup/', {
        username,
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
      <main className="signup-shell" aria-labelledby="signup-title">
        <section className="signup-brand-panel" aria-label="CashFlowGo onboarding summary">
          <p className="signup-eyebrow">Start with clarity</p>
          <h1 id="signup-title">CashFlowGo</h1>
          <p className="signup-subtitle">
            Create your account to organize personal, family, and business cash flow from one secure place.
          </p>
          <div className="signup-trust-list" aria-label="Account benefits">
            <span>Multi-profile tracking</span>
            <span>Subscription reminders</span>
            <span>Budget visibility</span>
          </div>
        </section>

        <form className="signup-card" onSubmit={handleSignup}>
          <div className="signup-card-header">
            <p className="signup-card-kicker">Create account</p>
            <h2>Sign up</h2>
          </div>

          <div className="signup-field">
            <label htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="signup-input"
              autoComplete="username"
              required
            />
          </div>

          <div className="signup-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="signup-input"
              autoComplete="email"
              required
            />
          </div>

          <div className="signup-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="signup-input"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="signup-field">
            <label htmlFor="signup-confirm-password">Confirm password</label>
            <input
              id="signup-confirm-password"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="signup-input"
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="signup-error" role="alert">{error}</p>}
          {success && <p className="signup-success" role="status">{success}</p>}

          <button type="submit" className="signup-button">Sign Up</button>

          <p className="signup-switch">
            Already have an account?
            <button type="button" onClick={() => navigate('/login')} className="signup-link-button">
              Log in
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

export default Signup;
