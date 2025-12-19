import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logoutUser } from '../../services/auth';
import './Header.css';

const Header = ({ title = 'The Chest', showBack = false, backPath = '/home' }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBack = () => {
    navigate(backPath);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        {showBack && (
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
        )}
        
        <div className="header-center">
          <h1 className="header-title">{title}</h1>
          {profile?.username && (
            <p className="header-subtitle">Welcome, {profile.username}</p>
          )}
        </div>
        
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;