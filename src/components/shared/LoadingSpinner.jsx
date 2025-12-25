import React, { useState, useEffect } from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Connecting Hearts...' }) => {
  const sizeClass = `spinner-${size}`;
  const [floatingElements, setFloatingElements] = useState([]);

  // Generate random floating elements
  useEffect(() => {
    const elements = [];
    const elementTypes = ['heart', 'star', 'circle', 'diamond'];
    
    for (let i = 0; i < 15; i++) {
      elements.push({
        id: i,
        type: elementTypes[Math.floor(Math.random() * elementTypes.length)],
        x: Math.random() * 100, // random starting position
        y: Math.random() * 100,
        size: Math.random() * 20 + 10,
        speed: Math.random() * 2 + 0.5,
        direction: Math.random() * 360,
        opacity: Math.random() * 0.5 + 0.2,
        delay: Math.random() * 5,
        animationDuration: Math.random() * 10 + 20
      });
    }
    
    setFloatingElements(elements);
  }, []);

  const getElementIcon = (type) => {
    switch(type) {
      case 'heart':
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        );
      case 'star':
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        );
      case 'circle':
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        );
      case 'diamond':
        return (
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L5 12l7 10 7-10-7-10z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="loading-spinner-container">
      <div className="universe-background">
        {/* Stars background */}
        <div className="stars"></div>
        <div className="stars-small"></div>
        <div className="stars-tiny"></div>
        
        {/* Nebula effect */}
        <div className="nebula"></div>
      </div>
      
      {/* Random floating elements */}
      <div className="floating-elements-container">
        {floatingElements.map((element) => (
          <div
            key={element.id}
            className={`floating-element floating-${element.type}`}
            style={{
              '--x': `${element.x}%`,
              '--y': `${element.y}%`,
              '--size': `${element.size}px`,
              '--speed': `${element.speed}`,
              '--direction': `${element.direction}deg`,
              '--opacity': element.opacity,
              '--delay': `${element.delay}s`,
              '--duration': `${element.animationDuration}s`
            }}
          >
            {getElementIcon(element.type)}
          </div>
        ))}
      </div>
      
      {/* Floating particles moving in patterns */}
      <div className="pattern-particles">
        {[...Array(25)].map((_, i) => (
          <div 
            key={i}
            className="pattern-particle"
            style={{
              '--i': i,
              '--pattern': i % 3,
              '--size': `${Math.random() * 4 + 2}px`,
              '--speed': `${Math.random() * 2 + 1}s`
            }}
          />
        ))}
      </div>
      
      <div className="spinner-wrapper">
        {/* Two hearts with connection line - Main focus */}
        <div className="hearts-connection">
          {/* Left Heart */}
          <div className="heart heart-left">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div className="heart-glow"></div>
          </div>
          
          {/* Connection Line */}
          <div className="heart-connection-line">
            <div className="line-main"></div>
            <div className="line-pulse"></div>
            <div className="connection-dots">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="connection-dot" style={{ '--i': i }}></div>
              ))}
            </div>
          </div>
          
          {/* Right Heart */}
          <div className="heart heart-right">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div className="heart-glow"></div>
          </div>
          
          {/* Pulse effect between hearts */}
          <div className="heart-pulse"></div>
          
          {/* Mini orbiting hearts */}
          <div className="mini-orbits">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mini-orbit" style={{ '--orbit-index': i }}>
                <div className="mini-heart">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Floating bubbles */}
        <div className="floating-bubbles">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i}
              className="bubble"
              style={{
                '--bubble-index': i,
                '--bubble-size': `${Math.random() * 20 + 10}px`,
                '--bubble-opacity': Math.random() * 0.3 + 0.1
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Loading text with typing effect */}
      <div className="loading-text-container">
        <p className="loading-text">
          {text}
          <span className="typing-dots">
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </span>
        </p>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>
      
      {/* Ambient light effect */}
      <div className="ambient-light"></div>
    </div>
  );
};

export default LoadingSpinner;