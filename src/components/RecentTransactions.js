import React from 'react';
import './RecentTransactions.css';

function RecentTransactions({ transactions }) {
  console.log('Transactions received in RecentTransactions:', transactions); // Debug log

  // Sort transactions by date (newest to oldest) and limit to 8
  const sortedTransactions = transactions
    .slice() // Create a copy of the transactions array
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date (newest first)
    .slice(0, 8); // Take the first 8 transactions

  return (
    <div className="recent-transactions">
      <div className="recent-transactions-header">
        <p>Latest activity</p>
        <h2>Recent Transactions</h2>
      </div>
      <div className="recent-transactions-table-shell">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.length > 0 ? (
              sortedTransactions.map((txn, index) => (
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
                  No recent transactions available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentTransactions;
