import React from 'react';
import './ConnectionVisualization.css';

const ConnectionVisualization = ({ partnerInfo, connectionStrength = 1 }) => {
  const strength = Math.min(Math.max(connectionStrength, 1), 5);

  return (
    <div className="connection-viz-root">
      
      {/* LEFT — YOU */}
      <div className="connection-side left">
        <span className="side-label">You</span>
        <div className="user-icon">
          <UserIcon />
        </div>
      </div>

      {/* CENTER — CONNECTION */}
      <div className="connection-center">
        <div className="connection-track">
          <div
            className="connection-fill"
            style={{
              width: `${strength * 20}%`,
              opacity: 0.4 + strength * 0.12
            }}
          />
        </div>
      </div>

      {/* RIGHT — PARTNER */}
      <div className="connection-side right">
        <div className="user-icon partner">
          <UserIcon />
        </div>
        <span className="partner-name">
          {partnerInfo?.username || 'Partner'}
        </span>
      </div>
    </div>
  );
};

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 
      7.2 4.5 7.2 7.2 9.3 12 12 12zm0 
      2.4c-3.2 0-9.6 1.6-9.6 
      4.8V22h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
  </svg>
);

export default ConnectionVisualization;
