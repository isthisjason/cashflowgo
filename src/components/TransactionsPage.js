import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axiosConfig';
import './TransactionsPage.css';

function TransactionsPage({ profile }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const loggedInUser = localStorage.getItem('loggedInUser');
        if (!loggedInUser) {
          console.error('User is not logged in. Redirecting...');
          navigate('/login');
          return;
        }

        console.log(`Fetching transactions for profile: ${profile}...`);
        const response = await axios.get(`/finances/transactions/${profile}/`); // Profile-specific API call

        // Log response for debugging
        console.log('Fetched transactions:', response.data);

        setTransactions(response.data);
      } catch (error) {
        if (error.response?.status === 401) {
          console.error('Unauthorized access. Redirecting to login...');
          navigate('/login');
        } else {
          console.error('Error fetching transactions:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [navigate, profile]); // Refetch when profile changes

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="transactions-page">
      <h2>Transactions for Profile: {profile}</h2> {/* Display current profile */}
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((txn, index) => (
              <tr key={index}>
                <td>{txn.category || 'Uncategorized'}</td>
                <td>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(txn.amount)}
                </td>
                <td>{new Date(txn.date).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" style={{ textAlign: 'center' }}>
                No transactions available for this profile.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionsPage;