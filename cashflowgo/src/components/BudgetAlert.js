import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import './BudgetAlert.css';

function BudgetAlert({ profile }) { // Receive profile as a prop
  const [budgetLimits, setBudgetLimits] = useState({ monthly: 0 });
  const [currentSpending, setCurrentSpending] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('BudgetAlert received profile:', profile); // Log received profile
    if (!profile) {
      console.error('Profile type is missing.');
      setError('Profile type is required. Please select a profile.');
      return;
    }
    setError(null); // Clear any previous error
    loadBudget();
  }, [profile]);

  const loadBudget = async () => {
    try {
      console.log('Fetching budget for profile:', profile); // Debug log
      const response = await axios.get('/finances/budget/', {
        params: { profile_type: profile || 'personal' }, // Fallback to 'personal'
      });
      const { monthly_limit = 0, current_spending = 0 } = response.data;
      console.log('Budget data loaded:', response.data); // Debug log
      setBudgetLimits({ monthly: monthly_limit });
      setCurrentSpending(current_spending);
      setError(null); // Clear error if API call succeeds
    } catch (err) {
      console.error('Error loading budget:', err.response?.data || err.message);
      setError('Failed to load budget. Please try again.');
    }
  };

  const updateBudget = async (updatedData) => {
    try {
      console.log('Payload sent to backend:', {
        ...updatedData,
        profile_type: profile,
      }); // Debug log for payload
      await axios.post('/finances/budget/', {
        ...updatedData,
        profile_type: profile, // Ensure profile_type is included
      });
    } catch (err) {
      console.error('Error updating budget:', err.response?.data || err.message);
      setError('Failed to update budget.');
    }
  };

  const handleLimitChange = (value) => {
    const updatedLimits = { ...budgetLimits, monthly: parseFloat(value) || 0 };
    console.log('Updated budget limits:', updatedLimits); // Debug log
    setBudgetLimits(updatedLimits);
    updateBudget({ monthly_limit: updatedLimits.monthly });
  };

  return (
    <div className="budget-alert">
      <h3>Budget for {profile} Profile</h3>

      {error && <div className="error-message">{error}</div>}

      <div className="budget-limits-form">
        <div className="limit-input">
          <label>Monthly Limit:</label>
          <input
            type="number"
            value={budgetLimits.monthly}
            onChange={(e) => handleLimitChange(e.target.value)}
            placeholder="Enter monthly limit"
          />
        </div>
      </div>

      <div className="spending-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${
                budgetLimits.monthly > 0
                  ? Math.min((currentSpending / budgetLimits.monthly) * 100, 100)
                  : 0
              }%`,
              backgroundColor: currentSpending >= budgetLimits.monthly ? '#ff4444' : '#4CAF50',
            }}
          />
        </div>
        <p>
          Monthly Spending: ${currentSpending} / ${budgetLimits.monthly}
        </p>
      </div>
    </div>
  );
}

export default BudgetAlert;