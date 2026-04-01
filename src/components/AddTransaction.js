import React, { useState } from 'react';
import axios from '../axiosConfig';
import './AddTransaction.css';

function AddTransaction({ profile, onAddTransaction, isModalOpen, onClose }) {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent duplicate submissions

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) {
      console.warn('Submission blocked: already submitting.');
      return; // Prevent duplicate submissions
    }
    setIsSubmitting(true);

    // Validate form data
    if (!formData.amount || !formData.category || !formData.date) {
      alert('Please fill in all fields.');
      setIsSubmitting(false);
      return;
    }

    // Format the date
    const correctedDate = new Date(formData.date);
    const adjustedDate = new Date(
      correctedDate.getTime() + correctedDate.getTimezoneOffset() * 60000
    ).toISOString().split('T')[0];

    const transactionData = {
      ...formData,
      date: adjustedDate,
      transaction_type: 'Expense',
      profile,
    };

    console.log('Submitting transaction:', transactionData);

    try {
      const response = await axios.post('/finances/add-transaction/', transactionData, {
        headers: {
          'X-CSRFToken': document.cookie.match(/csrftoken=([\w-]+)/)?.[1],
        },
      });

      console.log('Transaction added successfully:', response.data);

      onAddTransaction(response.data); // Notify parent
      setFormData({ amount: '', category: '', date: '' }); // Reset form
      onClose(); // Close modal
    } catch (error) {
      console.error('Error adding transaction:', error.response?.data || error.message);
      alert('Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false); // Unlock submission
    }
  };

  if (!isModalOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Add Transaction</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Amount:
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />
          </label>
          <label>
            Category:
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            />
          </label>
          <label>
            Date:
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Add'}
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddTransaction;