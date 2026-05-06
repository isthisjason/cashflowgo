import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axiosConfig';
import './TransactionsPage.css';

function TransactionsPage({ profile }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
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

        console.log(`Fetching all transactions for profile: ${profile}...`);
        const response = await axios.get('/finances/transactionspage/all/', {
          params: { profile_type: profile.toLowerCase() },
        });

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

  const downloadMonthlyReport = async () => {
    try {
      setIsDownloading(true);
      setDownloadError('');
      const response = await axios.get('/finances/reports/monthly-csv/', {
        params: {
          profile_type: profile.toLowerCase(),
          month: reportMonth,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeMonth = reportMonth || new Date().toISOString().slice(0, 7);
      link.href = url;
      link.setAttribute('download', `cashflowgo-${profile.toLowerCase()}-${safeMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading monthly report:', error);
      setDownloadError('Failed to download monthly report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="transactions-page">
      <div className="transactions-page-header">
        <div>
          <p className="transactions-page-eyebrow">Transaction history</p>
          <h2>{profile} Profile</h2>
        </div>
        <div className="report-controls">
          <label htmlFor="report-month">Monthly Report</label>
          <input
            id="report-month"
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
          />
          <button type="button" onClick={downloadMonthlyReport} disabled={isDownloading || !reportMonth}>
            {isDownloading ? 'Preparing CSV...' : 'Download CSV'}
          </button>
        </div>
      </div>
      {downloadError && <p className="report-error">{downloadError}</p>}
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
