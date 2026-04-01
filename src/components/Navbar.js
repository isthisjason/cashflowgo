import React from 'react';
import { NavLink } from 'react-router-dom';
import axios from '../axiosConfig'; // Import the axios instance
import { getCSRFToken } from '../axiosConfig'; // Import the CSRF token function
import './Navbar.css';

function Navbar({ profile, switchProfile, onLogout, showBudgetAlert, toggleBudgetAlert }) {
  const handleLogout = async () => {
    try {
      const csrfToken = getCSRFToken(); // Fetch the CSRF token

      // Perform the logout request
      await axios.post('/accounts/logout/', {}, {
        headers: {
          'X-CSRFToken': csrfToken, // Include the CSRF token in the headers
        },
        withCredentials: true, // Ensure cookies are sent with the request
      });

      console.log('User logged out successfully');
      onLogout(); // Call the logout function passed as a prop to update the app state
    } catch (error) {
      console.error('Logout failed:', error.response?.data || error.message);
    }
  };

  return (
    <div className="navbar-container">
      <nav className="navbar" aria-label="Main Navigation">
        <div className="navbar-logo">CashFlowGo</div>
        <div className="navbar-links">
          <NavLink to="/" activeClassName="active-link" exact>
            Dashboard
          </NavLink>
          <NavLink to="/transactions" activeClassName="active-link">
            Transactions
          </NavLink>
          <NavLink to="/subscriptions" activeClassName="active-link">
            Subscriptions
          </NavLink>

          {/* Profile Dropdown */}
          <div className="profile-dropdown">
            <select
              id="profile-select"
              value={profile}
              onChange={(e) => switchProfile(e.target.value.toLowerCase())} // Normalize to lowercase
              aria-label="Profile Selection"
            >
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="family">Family</option>
            </select>
          </div>

          <button
            className={`navbar-button ${showBudgetAlert ? 'active' : ''}`}
            onClick={toggleBudgetAlert}
            role="menuitem"
            aria-label="Toggle Budget Alerts"
          >
            Budget Alerts
          </button>
          <button
            onClick={handleLogout}
            className="logout-button"
            role="menuitem"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Budget Alert dropdown */}
      {showBudgetAlert && (
        <div className="dropdown-container budget-dropdown">
          <BudgetAlert profile={profile} /> {/* Pass profile as prop */}
        </div>
      )}
    </div>
  );
}

export default Navbar;