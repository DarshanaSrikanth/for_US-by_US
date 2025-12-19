import React, { useState, useEffect } from 'react';
import './ChestVisual.css';

const ChestVisual = ({ state = 'closed', unlockDate = null, size = 'large' }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (state === 'locked' && unlockDate) {
      const updateTimeRemaining = () => {
        const now = new Date();
        const unlock = new Date(unlockDate);
        const diff = unlock - now;
        
        if (diff <= 0) {
          setTimeRemaining('Ready!');
          return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      };
      
      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [state, unlockDate]);

  const getChestIcon = () => {
    switch(state) {
      case 'closed':
        return '📦';
      case 'locked':
        return '🔒📦';
      case 'unlocked':
        return '🔓📦';
      case 'open':
        return '📖';
      default:
        return '📦';
    }
  };

  const getChestClass = () => {
    let className = `chest-visual chest-${state}`;
    if (size) className += ` chest-${size}`;
    if (isHovered) className += ' chest-hovered';
    return className;
  };

  const getStatusText = () => {
    switch(state) {
      case 'closed':
        return 'Chest closed';
      case 'locked':
        return 'Chest locked';
      case 'unlocked':
        return 'Chest unlocked!';
      case 'open':
        return 'Chest opened';
      default:
        return '';
    }
  };

  return (
    <div 
      className={getChestClass()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="chest-icon">
        {getChestIcon()}
      </div>
      
      <div className="chest-status">
        <h3 className="status-text">{getStatusText()}</h3>
        
        {state === 'locked' && timeRemaining && (
          <div className="countdown">
            <div className="countdown-label">Unlocks in:</div>
            <div className="countdown-value">{timeRemaining}</div>
          </div>
        )}
        
        {state === 'unlocked' && (
          <div className="unlock-notice">
            <p>Ready to open!</p>
          </div>
        )}
        
        {state === 'locked' && unlockDate && (
          <div className="unlock-date">
            <p>Unlocks: {new Date(unlockDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      
      <div className="chest-decoration">
        <div className="decoration-line"></div>
        <div className="decoration-line"></div>
        <div className="decoration-line"></div>
      </div>
    </div>
  );
};

export default ChestVisual;