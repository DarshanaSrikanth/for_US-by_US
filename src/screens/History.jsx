import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getChitsHistory } from '../services/chits';
import Header from '../components/shared/Header';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import './History.css';

const History = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedChest, setSelectedChest] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const historyData = await getChitsHistory(user.uid);
        setHistory(historyData);
      } catch (err) {
        console.error('Error loading history:', err);
        setError('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  const handleChestSelect = (chest) => {
    setSelectedChest(chest);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedChest(null);
    setViewMode('list');
  };

  const handleGoHome = () => {
    navigate('/home');
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'Unknown time';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmotionDisplayName = (emotion) => {
    const names = {
      angry: 'Angry',
      sad: 'Sad',
      disappointed: 'Disappointed',
      grateful: 'Grateful',
      happy: 'Happy'
    };
    return names[emotion] || emotion;
  };

  const getEmotionIcon = (emotion) => {
    const icons = {
      angry: '🔥',
      sad: '💧',
      disappointed: '🌫️',
      grateful: '✨',
      happy: '🌈'
    };
    return icons[emotion] || '📝';
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      angry: '#e74c3c',
      sad: '#3498db',
      disappointed: '#95a5a6',
      grateful: '#2ecc71',
      happy: '#f39c12'
    };
    return colors[emotion] || '#333';
  };

  if (loading) {
    return (
      <div className="history-container">
        <Header title="History" showBack={true} backPath="/home" />
        <div className="history-loading">
          <LoadingSpinner size="large" text="Loading history..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <Header title="History" showBack={true} backPath="/home" />
        <div className="history-error">
          <div className="error-message">{error}</div>
          <button className="action-button" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <Header title="History" showBack={true} backPath="/home" />
      
      <main className="history-content">
        <div className="history-header">
          <h2>Reading History</h2>
          <p>Past chits from your partner</p>
        </div>

        {history.length === 0 ? (
          <div className="empty-history">
            <div className="empty-icon">📭</div>
            <h3>No History Yet</h3>
            <p>You haven't read any chits from your partner yet.</p>
            <p>Start a chest, add chits, and read them when it unlocks.</p>
            <button className="action-button" onClick={handleGoHome}>
              Go to Home
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <>
            <div className="history-stats">
              <div className="stat-card">
                <div className="stat-value">{history.length}</div>
                <div className="stat-label">Chests Read</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {history.reduce((total, chest) => total + chest.chits.length, 0)}
                </div>
                <div className="stat-label">Total Chits</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {history.length > 0 ? formatDate(history[0].unlockDate) : '--'}
                </div>
                <div className="stat-label">Most Recent</div>
              </div>
            </div>

            <div className="chests-list">
              {history.map((chest, index) => (
                <div 
                  key={chest.chestId}
                  className="chest-card"
                  onClick={() => handleChestSelect(chest)}
                >
                  <div className="chest-card-header">
                    <div className="chest-title">
                      <span className="chest-icon">📦</span>
                      <h3>Chest #{history.length - index}</h3>
                    </div>
                    <div className="chest-date">
                      {formatDate(chest.unlockDate)}
                    </div>
                  </div>
                  
                  <div className="chest-stats">
                    <div className="chest-stat">
                      <span className="stat-label">Chits:</span>
                      <span className="stat-value">{chest.chits.length}</span>
                    </div>
                    <div className="chest-stat">
                      <span className="stat-label">Status:</span>
                      <span className={`stat-value status-${chest.status}`}>
                        {chest.status === 'completed' ? 'Completed' : 
                         chest.status === 'opened' ? 'Read' : 'Unknown'}
                      </span>
                    </div>
                    <div className="chest-stat">
                      <span className="stat-label">Duration:</span>
                      <span className="stat-value">
                        {chest.startDate && chest.unlockDate ? 
                          Math.ceil((chest.unlockDate - chest.startDate) / (1000 * 60 * 60 * 24)) + ' days' : 
                          'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="chest-emotions">
                    {Object.entries(
                      chest.chits.reduce((acc, chit) => {
                        acc[chit.emotion] = (acc[chit.emotion] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emotion, count]) => (
                      <div key={emotion} className="emotion-tag">
                        <span 
                          className="emotion-dot"
                          style={{ backgroundColor: getEmotionColor(emotion) }}
                        ></span>
                        <span className="emotion-name">{getEmotionDisplayName(emotion)}</span>
                        <span className="emotion-count">({count})</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="chest-preview">
                    <p className="preview-text">
                      {chest.chits[0]?.content?.substring(0, 100)}
                      {chest.chits[0]?.content?.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  
                  <div className="view-details">
                    Click to view details →
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="chest-detail">
            <button 
              className="back-button"
              onClick={handleBackToList}
            >
              ← Back to List
            </button>
            
            <div className="detail-header">
              <div className="detail-title">
                <span className="detail-icon">📦</span>
                <h2>Chest Details</h2>
              </div>
              <div className="detail-meta">
                <div className="meta-item">
                  <span className="meta-label">Unlocked:</span>
                  <span className="meta-value">{formatDate(selectedChest.unlockDate)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status:</span>
                  <span className={`meta-value status-${selectedChest.status}`}>
                    {selectedChest.status === 'completed' ? 'Completed' : 'Read'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Total Chits:</span>
                  <span className="meta-value">{selectedChest.chits.length}</span>
                </div>
              </div>
            </div>
            
            <div className="chits-list">
              {selectedChest.chits.map((chit, index) => (
                <div key={chit.id} className="chit-item">
                  <div className="chit-header">
                    <div className="chit-number">#{index + 1}</div>
                    <div className="chit-emotion">
                      <span 
                        className="emotion-badge"
                        style={{ 
                          backgroundColor: getEmotionColor(chit.emotion),
                          color: 'white'
                        }}
                      >
                        {getEmotionIcon(chit.emotion)} {getEmotionDisplayName(chit.emotion)}
                      </span>
                    </div>
                    <div className="chit-date">
                      {formatDateTime(chit.createdAt)}
                    </div>
                  </div>
                  
                  <div className="chit-content">
                    {chit.content}
                  </div>
                  
                  <div className="chit-footer">
                    {chit.readAt && (
                      <div className="read-time">
                        Read on {formatDateTime(chit.readAt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="detail-summary">
              <h3>Summary</h3>
              <div className="emotion-summary">
                {Object.entries(
                  selectedChest.chits.reduce((acc, chit) => {
                    acc[chit.emotion] = (acc[chit.emotion] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([emotion, count]) => (
                  <div key={emotion} className="summary-item">
                    <div className="summary-emotion">
                      <span 
                        className="summary-dot"
                        style={{ backgroundColor: getEmotionColor(emotion) }}
                      ></span>
                      <span className="summary-label">{getEmotionDisplayName(emotion)}</span>
                    </div>
                    <div className="summary-count">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {viewMode === 'list' && history.length > 0 && (
          <div className="history-footer">
            <p className="footer-note">
              History is read-only. You cannot edit or delete past chits.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default History;