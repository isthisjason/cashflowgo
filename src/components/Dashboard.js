import React, { useState, useEffect, useCallback } from 'react';
import axios from '../axiosConfig';
import OverviewCard from './OverviewCard';
import RecentTransactions from './RecentTransactions';
import SummaryChart from './SummaryChart';
import AddTransaction from './AddTransaction';
import SpendingHabits from './SpendingHabits';
import NotificationBanner from './NotificationBanner';
import { getCSRFToken } from '../axiosConfig';
import './Dashboard.css';

function Dashboard({ profile, setIsAuthenticated }) {
  const [financialData, setFinancialData] = useState({
    income: 0,
    expenses: 0,
    transactions: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [timeframe, setTimeframe] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (next) => {
    setNotification(next);
  };

  // Fetch transactions and financial data
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    if (!localStorage.getItem('loggedInUser')) {
      console.error('User is not logged in.');
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const transactionsResponse = await axios.get('/finances/transactionspage/all/', {
        params: { profile_type: profile.toLowerCase() },
        withCredentials: true,
      });

      console.log('Fetched transactions (raw):', transactionsResponse.data);

      const uniqueTransactions = Array.from(
        new Map(transactionsResponse.data.map((txn) => [txn.id, txn])).values()
      );

      console.log('Deduplicated transactions:', uniqueTransactions);

      const incomeResponse = await axios.get(`/finances/adjusted-income/${profile.toLowerCase()}/`, {
        withCredentials: true,
      });

      const adjustedIncome = incomeResponse.data[`adjusted_income_${profile.toLowerCase()}`] || 0;

      const totalExpenses = uniqueTransactions
        .filter((t) => t.transaction_type === 'Expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      setFinancialData({
        income: adjustedIncome,
        expenses: totalExpenses,
        transactions: uniqueTransactions,
      });

      setTransactions(uniqueTransactions);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('loggedInUser');
      } else {
        showNotification({ type: 'error', message: 'Failed to fetch data. Please try again later.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile, setIsAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle adding a new transaction
  const handleAddTransaction = useCallback(
    async (newTransaction) => {
      if (isSubmitting) {
        console.warn('Submission already in progress');
        return;
      }
      setIsSubmitting(true);

      try {
        console.log('Starting transaction submission');
        const response = await axios.post(`/finances/add-transaction/`, newTransaction, {
          headers: { 'X-CSRFToken': getCSRFToken() },
          withCredentials: true,
        });

        console.log('Transaction submitted successfully');

        await fetchData();
        setIsAddTransactionOpen(false);
        return response;
      } catch (error) {
        console.error('Error adding transaction:', error);
        showNotification({ type: 'error', message: 'Failed to add transaction. Please try again.' });
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchData, isSubmitting]
  );

  // Handle income adjustment
  const handleIncomeChange = async (event) => {
    const newIncome = parseFloat(event.target.value) || 0;
    setFinancialData((prev) => ({
      ...prev,
      income: newIncome,
    }));

    try {
      await axios.patch(
        `/finances/adjusted-income/${profile.toLowerCase()}/`,
        { adjusted_income: newIncome },
        {
          headers: { 'X-CSRFToken': getCSRFToken() },
          withCredentials: true,
        }
      );
      console.log('Income updated successfully');
    } catch (error) {
      console.error('Error updating income:', error.response?.data || error.message);
    }
  };

  return (
    <div className="dashboard-content">
      <h2>Current Profile: {profile.toUpperCase()}</h2>
      <NotificationBanner notification={notification} onDismiss={() => setNotification(null)} />

      {isLoading ? (
        <p>Loading data for {profile}...</p>
      ) : (
        <>
          <div className="overview-section">
            <div className="financial-overview">
              <OverviewCard title="Total Income" amount={`$${financialData.income}`} color="green" />
              <div className="income-slider-container">
                <input
                  id="income-slider"
                  type="range"
                  min="0"
                  max="250000"
                  value={financialData.income}
                  onChange={handleIncomeChange}
                  className="slider"
                />
              </div>
              <OverviewCard title="Total Expenses" amount={`$${financialData.expenses}`} color="red" />
              <OverviewCard
                title="Net Balance"
                amount={`$${(financialData.income - financialData.expenses).toLocaleString()}`}
                color="blue"
              />
            </div>
          </div>

          <RecentTransactions transactions={transactions} />
          <SummaryChart
            profile={profile}
            transactions={transactions}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
          />
          <SpendingHabits transactions={transactions} />
        </>
      )}

      <AddTransaction
        profile={profile}
        onAddTransaction={handleAddTransaction}
        isModalOpen={isAddTransactionOpen && !isSubmitting}
        onClose={() => setIsAddTransactionOpen(false)}
        onNotify={showNotification}
      />

      <div className="floating-buttons">
        <button
          onClick={() => setIsAddTransactionOpen(true)}
          className="floating-button transaction-button"
        >
          + Transaction
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
