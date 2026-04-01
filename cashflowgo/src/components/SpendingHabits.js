import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js';
import './SpendingHabits.css';

ChartJS.register(BarElement, CategoryScale, LinearScale);

function SpendingHabits({ profile, transactions }) {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Spending by Category',
        data: [],
        backgroundColor: '#f78c6c', // Soft red-orange color for bars
      },
    ],
  });

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Group transactions by category and calculate total spending per category
      const categoryTotals = transactions.reduce((acc, txn) => {
        const category = txn.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + parseFloat(txn.amount);
        return acc;
      }, {});

      // Sort categories by spending in descending order
      const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

      // Prepare data for the chart
      const labels = sortedCategories.map(([category]) => category);
      const data = sortedCategories.map(([, total]) => total);

      setChartData({
        labels,
        datasets: [
          {
            label: 'Spending by Category',
            data,
            backgroundColor: '#f78c6c', // Bar color
          },
        ],
      });
    } else {
      // Reset chart data if no transactions are available
      setChartData({
        labels: [],
        datasets: [
          {
            label: 'Spending by Category',
            data: [],
            backgroundColor: '#f78c6c',
          },
        ],
      });
    }
  }, [transactions]);

  return (
    <div className="spending-habits">
      <h2>Spending by Category</h2>
      <div className="canvas-container">
        <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>
      {chartData.labels.length === 0 && (
        <p style={{ textAlign: 'center', color: 'gray', fontStyle: 'italic', marginTop: '20px' }}>
          No spending data available.
        </p>
      )}
    </div>
  );
}

export default SpendingHabits;