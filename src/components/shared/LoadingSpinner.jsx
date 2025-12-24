import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = ' Loading...' }) => {
  const sizeClass = `spinner-${size}`;
  
  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${sizeClass}`}></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;