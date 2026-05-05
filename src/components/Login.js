import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axiosConfig'; // Use the centralized instance
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await axios.post('/accounts/login/', {
        email,
        password,
      });
      console.log('Login response:', response.data);

      localStorage.setItem('loggedInUser', JSON.stringify(response.data.user));
      console.log('Logged in user saved:', localStorage.getItem('loggedInUser'));

      const csrfToken = response.data.csrf_token;
      if (csrfToken) {
        document.cookie = `csrftoken=${csrfToken}; path=/`;
        console.log('CSRF token set:', csrfToken);
      }

      if (onLogin) onLogin();

      console.log('Redirecting to dashboard');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err.response?.data || err);
      if (!err.response) {
        setError('Cannot reach API server. Start backend at http://127.0.0.1:8000 and try again.');
      } else {
        setError(err.response?.data?.error || 'Login failed. Check credentials and try again.');
      }
    }
  };

  const handleSignupRedirect = () => {
    console.log('Redirecting to signup');
    navigate('/signup');
  };

  return (
    <div className="login-container">
      <main className="login-shell" aria-labelledby="login-title">
        <section className="login-brand-panel" aria-label="CashFlowGo security summary">
          <p className="login-eyebrow">Personal finance workspace</p>
          <h1 className="app-title" id="login-title">CashFlowGo</h1>
          <p className="login-subtitle">
            Sign in to review spending, budgets, subscriptions, and cash flow in one focused dashboard.
          </p>
          <div className="login-trust-list" aria-label="Account protections">
            <span>Secure session</span>
            <span>Budget alerts</span>
            <span>Private profiles</span>
          </div>
        </section>

        <form className="login-box" onSubmit={handleLogin}>
          <div className="login-box-header">
            <p className="login-box-kicker">Welcome back</p>
            <h2>Log in</h2>
          </div>

          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button type="submit" className="button button-primary">Login</button>

          <p className="login-switch">
            New to CashFlowGo?
            <button type="button" onClick={handleSignupRedirect} className="login-link-button">
              Create an account
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

export default Login;
