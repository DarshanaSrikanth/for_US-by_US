import React, { useState } from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';
import { logoutUser } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

const Header = ({ 
  title = 'The Chest', 
  showBack = false, 
  backPath = '/home',
  logoUrl = '/path/to/your/logo.png' // Replace with your actual logo path
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setTimeout(() => {
      console.log('Logged out');
      setIsLoggingOut(false);
    }, 1000);
  };

  const handleBack = () => {
    console.log('Navigate to:', backPath);
  };

  

  return (
    <header className="classic-header">
      {/* Animated background pattern */}
      <div className="header-bg-pattern">
        <div className="pattern-line line-1"></div>
        <div className="pattern-line line-2"></div>
        <div className="pattern-line line-3"></div>
        <div className="pattern-line line-4"></div>
      </div>

      <div className="header-container">
        {/* Left side - Logo and back button */}
        <div className="header-left">
          {showBack && (
            <button className="back-btn" onClick={handleBack}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="logo-container">
            <div className="logo-glow"></div>
            <img 
              src={logoUrl} 
              alt={title}
              className="header-logo"
              onError={(e) => {
                // Fallback if image doesn't load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            
          </div>
        </div>

        {/* Right side - Logout button */}
        <div className="header-right">
          <button 
            className={`logout-btn ${isLoggingOut ? 'logging-out' : ''}`}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <span className="logout-text">
              {isLoggingOut ? 'Logging out...' : ''}
            </span>
            <LogOut size={18} className="logout-icon" />
          </button>
        </div>
      </div>

      <style jsx>{`
        .classic-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: linear-gradient(135deg, #ffe9d1ff 0%, #ffe8dbff 140%, #f5efd9ff 100%);
          border-bottom: 2px solid rgba(226, 207, 178, 0.3);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          position: relative;
        }

        .header-bg-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          opacity: 0.15;
        }

        .pattern-line {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, #e2cfb2, transparent);
          width: 100%;
          animation: slide 8s linear infinite;
        }

        .line-1 {
          top: 20%;
          animation-delay: 0s;
        }

        .line-2 {
          top: 40%;
          animation-delay: 2s;
        }

        .line-3 {
          top: 60%;
          animation-delay: 4s;
        }

        .line-4 {
          top: 80%;
          animation-delay: 6s;
        }

        @keyframes slide {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .header-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          background: rgba(226, 207, 178, 0.1);
          border: 1px solid rgba(226, 207, 178, 0.3);
          color: #e2cfb2;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .back-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(226, 207, 178, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }

        .back-btn:hover::before {
          width: 100%;
          height: 100%;
        }

        .back-btn:hover {
          border-color: #e2cfb2;
          transform: translateX(-2px);
        }

        .logo-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(226, 207, 178, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
        }

        .header-logo {
          height: 50px;
          width: auto;
          max-width: 200px;
          object-fit: contain;
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 2px 8px rgba(226, 207, 178, 0.3));
          transition: transform 0.3s ease;
        }

        .header-logo:hover {
          transform: scale(1.05);
        }

        .logo-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 20px;
          background: rgba(226, 207, 178, 0.1);
          border: 1px solid rgba(226, 207, 178, 0.3);
          border-radius: 8px;
          position: relative;
          z-index: 2;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 600;
          color: #e2cfb2;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-family: 'Georgia', serif;
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .logout-btn {
          background: linear-gradient(135deg, #0f163dff 0%, #180f28ff 100%);
          border: none;
          color: #1a1a2e;
          padding: 10px 24px;
          border-radius: 50px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(226, 207, 178, 0.3);
          position: relative;
          overflow: hidden;
        }

        .logout-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s ease;
        }

        .logout-btn:hover::before {
          left: 100%;
        }

        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(226, 207, 178, 0.5);
        }

        .logout-btn:active {
          transform: translateY(0);
        }

        .logout-btn.logging-out {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .logout-btn.logging-out .logout-icon {
          animation: rotate 1s linear infinite;
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .logout-text {
          position: relative;
          z-index: 2;
        }

        .logout-icon {
          position: relative;
          z-index: 2;
          transition: transform 0.3s ease;
          color: white;
        }

        .logout-btn:hover .logout-icon {
          transform: translateX(3px);
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 12px 16px;
          }

          .header-logo {
            height: 40px;
          }

          .logo-text {
            font-size: 1.2rem;
          }

          .logout-btn {
            padding: 8px 18px;
            font-size: 0.85rem;
          }

          .logout-text {
            display: none;
          }

          .logout-icon {
            margin: 0;
          }
        }

        @media (max-width: 480px) {
          .header-container {
            padding: 10px 12px;
          }

          .header-logo {
            height: 35px;
          }

          .logo-text {
            font-size: 1rem;
            letter-spacing: 1px;
          }

          .back-btn {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;