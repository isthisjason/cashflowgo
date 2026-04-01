import React from 'react';
import './NotificationBanner.css';

function NotificationBanner({ notification, onDismiss }) {
  if (!notification?.message) return null;

  return (
    <div className={`notification-banner ${notification.type || 'info'}`} role="status" aria-live="polite">
      <span>{notification.message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        x
      </button>
    </div>
  );
}

export default NotificationBanner;

