import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Connecting Hearts...' }) => {
  return (
    <div className={`simple-spinner-container spinner-${size}`}>
      {/* Heart */}
      <div className="simple-heart">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
            4.42 3 7.5 3c1.74 0 3.41.81 
            4.5 2.09C13.09 3.81 14.76 3 
            16.5 3 19.58 3 22 5.42 
            22 8.5c0 3.78-3.4 6.86-8.55 
            11.54L12 21.35z" />
        </svg>
      </div>

      {/* Soft ring pulse */}
      <div className="heart-ring"></div>

      {/* Text */}
      <p className="simple-loading-text">
        {text}
        <span className="dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
    </div>
  );
};

export default LoadingSpinner;
