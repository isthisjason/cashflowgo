import React from 'react';
import './OverviewCard.css';

function OverviewCard({ title, amount, color }) {
  return (
    <div className={`overview-card overview-card-${color}`}>
      <h3>{title}</h3>
      <p>{amount}</p>
    </div>
  );
}

export default OverviewCard;
