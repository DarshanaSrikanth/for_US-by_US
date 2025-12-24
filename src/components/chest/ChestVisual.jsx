import React, { useState, useEffect, useRef } from 'react';
import './ChestVisual.css';

const ChestVisual = ({ state = 'closed', unlockDate = null, size = 'large' }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);

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
      const interval = setInterval(updateTimeRemaining, 60000);
      
      return () => clearInterval(interval);
    }
  }, [state, unlockDate]);

  // Create particles for opening animation
  const createParticles = () => {
    if (containerRef.current && state === 'open') {
      const container = containerRef.current;
      const particles = container.querySelector('.particles');
      particles.innerHTML = '';
      
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random starting position around chest
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 40;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.animationDelay = `${i * 0.05}s`;
        
        particles.appendChild(particle);
      }
    }
  };

  useEffect(() => {
    if (state === 'open') {
      setTimeout(createParticles, 300); // Delay for lid opening
    }
  }, [state]);

  const getChestClass = () => {
    let className = `chest-visual chest-${state}`;
    if (size) className += ` chest-${size}`;
    if (isHovered) className += ' chest-hovered';
    return className;
  };

  const getStatusText = () => {
    switch(state) {
      case 'closed':
        return '';
      case 'locked':
        return 'Locked Chest';
      case 'unlocked':
        return 'Ready to Open!';
      case 'open':
        return 'Treasure Revealed!';
      default:
        return '';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={getChestClass()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Chest */}
      <div className="chest-3d-container">
        <div className="chest-base"></div>
        <div className="chest-body">
          <div className="wood-grain"></div>
          <div className="metal-band horizontal top"></div>
          <div className="metal-band horizontal bottom"></div>
          <div className="metal-band vertical left"></div>
          <div className="metal-band vertical right"></div>
        </div>
        <div className="chest-lid">
          <div className="wood-grain"></div>
          <div className="metal-band horizontal top"></div>
        </div>
        
        {/* Lock */}
        {(state === 'locked' || state === 'unlocked') && (
          <div className="chest-lock">
            <div className="lock-hole"></div>
          </div>
        )}
        
        {/* Treasure Glow */}
        {state === 'open' && <div className="treasure-glow"></div>}
      </div>

      {/* Status Display */}
      <div className="chest-status">
        <h3 className="status-text">{getStatusText()}</h3>
        
        {state === 'locked' && timeRemaining && (
          <div className="countdown">
            <div className="countdown-label">Unlocks In</div>
            <div className="countdown-value">{timeRemaining}</div>
          </div>
        )}
        
        
        {state === 'locked' && unlockDate && (
          <div className="unlock-date">
            <p>Unlock Date: {new Date(unlockDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      
      {/* Decorative Elements */}
      <div className="chest-decoration">
        <div className="decoration-line"></div>
        <div className="decoration-line"></div>
        <div className="decoration-line"></div>
      </div>
      
      {/* Particles Container */}
      <div className="particles"></div>
    </div>
  );
};

export default ChestVisual;