import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Legend, Tooltip } from 'chart.js';
import './SummaryChart.css';

ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const chartColors = {
  income: '#22c55e',
  expenses: '#ef4444',
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

function SummaryChart({ profile, transactions, timeframe, setTimeframe }) {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      { label: 'Income', data: [], backgroundColor: chartColors.income, borderRadius: 8 },
      { label: 'Expenses', data: [], backgroundColor: chartColors.expenses, borderRadius: 8 },
    ],
  });
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    console.log(`Timeframe changed to: ${timeframe}`);
    if (transactions && transactions.length > 0) {
      console.log('Processing transactions:', transactions);

      const groupedData = transactions.reduce((acc, t) => {
        const transactionDate = new Date(t.date);
        let key;
        let label;

        if (timeframe === 'weekly') {
          const weekStart = new Date(transactionDate);
          weekStart.setDate(transactionDate.getDate() - transactionDate.getDay());
          key = weekStart.toISOString().slice(0, 10);
          label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else if (timeframe === 'monthly') {
          key = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
          label = transactionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (timeframe === 'yearly') {
          key = `${transactionDate.getFullYear()}`;
          label = key;
        }

        if (!acc[key]) {
          acc[key] = { income: 0, expenses: 0, label };
        }

        if (t.transaction_type === 'Income') {
          acc[key].income += parseFloat(t.amount);
        } else if (t.transaction_type === 'Expense') {
          acc[key].expenses += parseFloat(t.amount);
        }

        return acc;
      }, {});

      const labels = Object.keys(groupedData).sort().map((key) => groupedData[key].label);
      const incomeData = Object.keys(groupedData).sort().map((key) => groupedData[key].income);
      const expenseData = Object.keys(groupedData).sort().map((key) => groupedData[key].expenses);

      console.log('Grouped Data:', groupedData);

      setHasData(incomeData.some((val) => val > 0) || expenseData.some((val) => val > 0));
      setChartData({
        labels,
        datasets: [
          { label: 'Income', data: incomeData, backgroundColor: chartColors.income, borderRadius: 8 },
          { label: 'Expenses', data: expenseData, backgroundColor: chartColors.expenses, borderRadius: 8 },
        ],
      });
    } else {
      setHasData(false);
      setChartData({
        labels: [],
        datasets: [
          { label: 'Income', data: [], backgroundColor: chartColors.income, borderRadius: 8 },
          { label: 'Expenses', data: [], backgroundColor: chartColors.expenses, borderRadius: 8 },
        ],
      });
    }
  }, [transactions, timeframe]);

  const handleTimeframeChange = (event) => {
    const newTimeframe = event.target.value.toLowerCase();
    setTimeframe(newTimeframe); // Trigger parent state update
  };

  return (
    <div className="summary-chart">
      <div className="summary-chart-header">
        <div>
          <p className="summary-chart-eyebrow">Cash flow trend</p>
          <h2>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Summary</h2>
        </div>
        <div className="timeframe-selector">
          <label htmlFor="timeframe">Timeframe</label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={handleTimeframeChange}
            className="timeframe-dropdown"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div className="summary-chart-canvas">
        <Bar data={chartData} options={chartOptions} />
      </div>
      {!hasData && (
        <p className="summary-chart-empty">
          No data available for this profile.
        </p>
      )}
    </div>
  );
}

export default SummaryChart;
