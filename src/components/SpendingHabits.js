import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from 'chart.js';
import './SpendingHabits.css';

ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const chartColors = {
  spending: '#fbbf24',
  text: '#d4d4d8',
  muted: '#a1a1aa',
  grid: 'rgba(255, 255, 255, 0.08)',
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: chartColors.text,
        boxWidth: 12,
        boxHeight: 12,
        font: {
          family: 'IBM Plex Sans',
          weight: '600',
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(9, 9, 11, 0.94)',
      borderColor: 'rgba(255, 255, 255, 0.16)',
      borderWidth: 1,
      titleColor: '#ffffff',
      bodyColor: chartColors.text,
      padding: 12,
    },
  },
  scales: {
    x: {
      ticks: {
        color: chartColors.muted,
      },
      grid: {
        color: chartColors.grid,
      },
    },
    y: {
      ticks: {
        color: chartColors.muted,
      },
      grid: {
        color: chartColors.grid,
      },
    },
  },
};

function SpendingHabits({ profile, transactions }) {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Spending by Category',
        data: [],
        backgroundColor: chartColors.spending,
        borderRadius: 8,
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
            backgroundColor: chartColors.spending,
            borderRadius: 8,
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
            backgroundColor: chartColors.spending,
            borderRadius: 8,
          },
        ],
      });
    }
  }, [transactions]);

  return (
    <div className="spending-habits">
      <h2>Spending by Category</h2>
      <div className="canvas-container">
        <Bar data={chartData} options={chartOptions} />
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
