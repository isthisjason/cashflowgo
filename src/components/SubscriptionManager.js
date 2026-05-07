import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig'; // For authenticated API requests
import './SubscriptionManager.css';

function SubscriptionManager({ profile }) { // Profile passed as a prop
  const [subscriptions, setSubscriptions] = useState([]);
  const [newSubscription, setNewSubscription] = useState({
    name: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    reminderDays: '7',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubscriptions();
  }, [profile]); // Re-load subscriptions when the profile changes

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      console.log(`Fetching subscriptions for profile: ${profile}`);
      const normalizedProfile = profile.toLowerCase(); // Normalize profile type
      const response = await axios.get(`/finances/subscriptions/`, {
        params: { profile_type: normalizedProfile }, // Use params for query string
      });
      console.log('Loaded subscriptions:', response.data);
      setSubscriptions(response.data);
      setError(null);
    } catch (err) {
      console.error('Error loading subscriptions:', err.response?.data || err.message);
      setError('Failed to load subscriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async () => {
    const subscriptionData = {
      name: newSubscription.name,
      amount: parseFloat(newSubscription.amount),
      start_date: newSubscription.startDate,
      expiry_date: newSubscription.expiryDate,
      reminder_days: parseInt(newSubscription.reminderDays),
      email: newSubscription.email,
      profile_type: profile.toLowerCase(), // Normalize profile type
    };

    console.log('Submitting subscription data:', subscriptionData); // Debug log

    try {
      const response = await axios.post('/finances/subscriptions/', subscriptionData);
      console.log('Subscription added:', response.data);

      setSubscriptions([...subscriptions, response.data]);
      setNewSubscription({
        name: '',
        amount: '',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        reminderDays: '7',
        email: ''
      });
      setError(null);
    } catch (err) {
      console.error('Error adding subscription:', err.response?.data || err.message);
      setError('Failed to add subscription');
    }
  };

  const deleteSubscription = async (id) => {
    try {
      console.log(`Deleting subscription with ID: ${id}`);
      await axios.delete(`/finances/subscriptions/${id}/`);
      setSubscriptions(subscriptions.filter((sub) => sub.id !== id));
    } catch (err) {
      console.error('Error deleting subscription:', err);
      setError('Failed to delete subscription. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading subscriptions...</div>;
  }

  return (
    <div className="subscriptions-page">
      <h2>Subscriptions for {profile} Profile</h2>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="subscription-input">
        <h3>Add New Subscription</h3>
        <div className="form-grid">
          <label htmlFor="subscription-name">Subscription Name</label>
          <input
            id="subscription-name"
            type="text"
            placeholder="Subscription Name"
            value={newSubscription.name}
            onChange={(e) => setNewSubscription({
              ...newSubscription,
              name: e.target.value
            })}
          />
          <label htmlFor="subscription-amount">Amount</label>
          <input
            id="subscription-amount"
            type="number"
            placeholder="Amount"
            value={newSubscription.amount}
            onChange={(e) => setNewSubscription({
              ...newSubscription,
              amount: e.target.value
            })}
          />
          <input
            type="email"
            placeholder="Notification Email"
            value={newSubscription.email}
            onChange={(e) => setNewSubscription({
              ...newSubscription,
              email: e.target.value
            })}
          />
          <input
            type="date"
            placeholder="Start Date"
            value={newSubscription.startDate}
            onChange={(e) => setNewSubscription({
              ...newSubscription,
              startDate: e.target.value
            })}
          />
          <input
            type="date"
            placeholder="Expiry Date"
            value={newSubscription.expiryDate}
            onChange={(e) => setNewSubscription({
              ...newSubscription,
              expiryDate: e.target.value
            })}
          />
          <select
            value={newSubscription.reminderDays}
            onChange={(e) => setNewSubscription({
              ...newSubscription,
              reminderDays: e.target.value
            })}
          >
            <option value="3">Remind 3 days before</option>
            <option value="7">Remind 7 days before</option>
            <option value="14">Remind 14 days before</option>
            <option value="30">Remind 30 days before</option>
          </select>
          <button
            onClick={addSubscription}
            disabled={
              !newSubscription.name ||
              !newSubscription.amount ||
              newSubscription.amount <= 0 || // Ensure amount is positive
              !newSubscription.expiryDate ||
              !newSubscription.email ||
              !/\S+@\S+\.\S+/.test(newSubscription.email) // Validate email format
            }
            className="add-button"
          >
            Add Subscription
          </button>
        </div>
      </div>

      <div className="subscription-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Start Date</th>
              <th>Expiry Date</th>
              <th>Reminder</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td>{sub.name}</td>
                <td>{isNaN(Number(sub.amount)) ? 'Invalid Amount' : `$${Number(sub.amount).toFixed(2)}`}</td>
                <td>{new Date(sub.start_date).toLocaleDateString()}</td>
                <td>{new Date(sub.expiry_date).toLocaleDateString()}</td>
                <td>{sub.reminder_days} days before</td>
                <td>{sub.email}</td>
                <td>
                  <button
                    onClick={() => deleteSubscription(sub.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SubscriptionManager;
