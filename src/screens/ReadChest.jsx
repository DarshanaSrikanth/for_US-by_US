import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getChitsForChest, markChitAsRead } from '../services/chits';
import { getChestById, updateChestStatus } from '../services/chest';
import { getCalmingMessage, getCompletionMessage } from '../utils/messageEngine';
import { getPartnerInfo } from '../services/pairing';
import Header from '../components/shared/Header';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import './ReadChest.css';

const ReadChest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [chestId, setChestId] = useState(null);
  const [chestData, setChestData] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  
  const [chits, setChits] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readChits, setReadChits] = useState(new Set());
  const [showCalmingMessage, setShowCalmingMessage] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  
  const [progress, setProgress] = useState(0);
  
  const contentRef = useRef(null);
  const messageRef = useRef(null);
  
    // Mark chit as read
  const markCurrentChitAsRead = useCallback(async () => {
    if (chits.length === 0 || currentIndex >= chits.length) return;
    
    const currentChit = chits[currentIndex];
    if (readChits.has(currentChit.id)) return;
    
    try {
      await markChitAsRead(chestId, currentChit.id, user.uid);
      setReadChits(prev => new Set([...prev, currentChit.id]));
    } catch (err) {
      console.error('Error marking chit as read:', err);
    }
  }, [chestId, chits, currentIndex, readChits, user.uid]);
  
  // Load chest and chits
  useEffect(() => {
    const initialize = async () => {
      if (!user || !profile) return;

      try {
        setLoading(true);
        
        // Get chest ID from location state
        const chestIdFromState = location.state?.chestId;
        if (!chestIdFromState) {
          throw new Error('No chest specified');
        }
        
        setChestId(chestIdFromState);
        
        // Load chest data
        const chest = await getChestById(chestIdFromState);
        if (!chest) {
          throw new Error('Chest not found');
        }
        
        setChestData(chest);
        
        // Check if chest is unlockable or opened
        if (chest.status !== 'unlockable' && chest.status !== 'opened') {
          throw new Error('This chest is not ready to be opened');
        }
        
        // Check if user is authorized
        if (chest.userId1 !== user.uid && chest.userId2 !== user.uid) {
          throw new Error('You are not authorized to read this chest');
        }
        
        // Load partner info
        const partnerId = chest.userId1 === user.uid ? chest.userId2 : chest.userId1;
        const partner = await getPartnerInfo(partnerId);
        setPartnerInfo(partner);
        
        // Load chits from partner - FIX: Get partner's chits, not user's chits
        const partnerChits = await getChitsForChest(chestIdFromState, partnerId);
        
        // FIX: Handle empty chests - DON'T navigate automatically
        if (partnerChits.length === 0) {
          // Just set empty chits array and continue
          setChits([]);
          // We'll lt the user see the empty state and complete reading normally
        } else {
          setChits(partnerChits);
        }
        
        // Mark chest as opened if it's still unlockable
        if (chest.status === 'unlockable') {
          await updateChestStatus(chestIdFromState, 'opened');
        }
        
      } catch (err) {
        console.error('Error initializing ReadChest:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user, profile, location, navigate]); // Add navigate to dependencies

  // Handle scroll to reveal calming message
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current && messageRef.current) {
        const contentRect = contentRef.current.getBoundingClientRect();
        const messageRect = messageRef.current.getBoundingClientRect();
        
        // Show message when user scrolls to the bottom of content
        if (messageRect.top <= window.innerHeight * 0.8) {
          setShowCalmingMessage(true);
          
          // Mark chit as read when message is revealed
          markCurrentChitAsRead();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentIndex, markCurrentChitAsRead]);

  // Update progress
  useEffect(() => {
    if (chits.length > 0) {
      const progressValue = Math.round(((currentIndex + 1) / chits.length) * 100);
      setProgress(progressValue);
    } else {
      setProgress(0);
    }
  }, [currentIndex, chits.length]);



  // Handle next chit
  const handleNextChit = () => {
    if (chits.length === 0) {
      // Empty chest - directly show completion
      handleCompleteReading();
      return;
    }
    
    if (currentIndex < chits.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowCalmingMessage(false);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // All chits read - show completion
      handleCompleteReading();
    }
  };

  // Handle previous chit
  const handlePreviousChit = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowCalmingMessage(false);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle reading completion
  const handleCompleteReading = () => {
    setShowCompletion(true);
  };

  // Handle completion acknowledgment
  const handleCompletionAcknowledge = async () => {
    try {
      // Mark chest as completed before navigating
      if (chestId) {
        await updateChestStatus(chestId, 'completed');
      }
    } catch (err) {
      console.error('Error marking chest as completed:', err);
    }
    navigate('/home');
  };

  // Get emotion display name
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

  // Get emotion icon
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

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="readchest-container">
        <Header title="Reading Chest" showBack={true} backPath="/home" />
        <div className="readchest-loading">
          <LoadingSpinner size="large" text="Opening chest..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="readchest-container">
        <Header title="Reading Chest" showBack={true} backPath="/home" />
        <div className="readchest-error">
          <div className="error-message">
            {error.includes('No chits') || error.includes('empty') || error.includes('Chest was empty') ? (
              <>
                <div className="empty-chest-icon">📭</div>
                <h3>Empty Chest</h3>
                <p>No chits were added to this chest by your partner.</p>
                <button 
                  className="action-button"
                  onClick={async () => {
                    // Mark chest as completed and navigate home
                    try {
                      if (chestId) {
                        await updateChestStatus(chestId, 'completed');
                      }
                    } catch (err) {
                      console.error('Error marking chest as completed:', err);
                    }
                    navigate('/home');
                  }}
                >
                  Return to Home
                </button>
              </>
            ) : (
              <>
                <div className="error-message-text">{error}</div>
                <button className="action-button" onClick={() => navigate('/home')}>
                  Back to Home
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showCompletion) {
    // Handle empty chest completion
    if (chits.length === 0) {
      return (
        <div className="readchest-container">
          <Header title="Reading Complete" showBack={false} />
          
          <div className="completion-screen">
            <h2 className="completion-title">Empty Chest</h2>
            <div className="completion-message">
              No chits were added to this chest by your partner.
            </div>
            
            <div className="reading-stats">
              <div className="stat-item">
                <span className="stat-label">Chits read:</span>
                <span className="stat-value">0</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">From:</span>
                <span className="stat-value">{partnerInfo?.username || 'Partner'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">duration:</span>
                <span className="stat-value">
                  {chestData?.settings?.durationDays || 7} days
                </span>
              </div>
            </div>
            
            <button
              className="completion-button"
              onClick={async () => {
                // Mark chest as completed before returning home
                try {
                  if (chestId) {
                    await updateChestStatus(chestId, 'completed');
                  }
                } catch (err) {
                  console.error('Error marking chest as completed:', err);
                }
                navigate('/home');
              }}
            >
              Return to Home
            </button>
            
            <div className="completion-note">
              <p>You can start a new chest to continue sharing.</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Handle normal (non-empty) chest completion
    const completionMessage = getCompletionMessage();
    
    return (
      <div className="readchest-container">
        <Header title="Reading Complete" showBack={false} />
        
        <div className="completion-screen">
          <div className="completion-icon">📖</div>
          <h2 className="completion-title">Reading Complete</h2>
          <div className="completion-message">
            {completionMessage}
          </div>
          
          <div className="reading-stats">
            <div className="stat-item">
              <span className="stat-label">Chits read:</span>
              <span className="stat-value">{chits.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">From:</span>
              <span className="stat-value">{partnerInfo?.username}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Chest duration:</span>
              <span className="stat-value">
                {chestData?.settings?.durationDays || 7} days
              </span>
            </div>
          </div>
          
          <button
            className="completion-button"
            onClick={handleCompletionAcknowledge}
          >
            Return to Home
          </button>
          
          <div className="completion-note">
            <p>Take your time to reflect before responding.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentChit = chits[currentIndex];
  const calmingMessage = getCalmingMessage(currentChit?.emotion);

  return (
    <div className="readchest-container">
      <Header title="Reading Chest" showBack={true} backPath="/home" />
      
      <main className="readchest-content">
        {/* Progress Bar */}
        <div className="reading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {chits.length === 0 ? '' : `${currentIndex + 1} of ${chits.length} chits`}
          </div>
        </div>

        {/* Partner Info */}
        {partnerInfo && (
          <div className="partner-context">
            <div className="partner-avatar">
              {partnerInfo.username.charAt(0).toUpperCase()}
            </div>
            <div className="partner-details">
              <h3>From {partnerInfo.username}</h3>
              <p>Chest started {chestData?.startDate && formatDate(chestData.startDate)}</p>
            </div>
          </div>
        )}

        {/* Main Reading Area */}
        <div className="reading-area">
          {/* Upper Section: Chit Content */}
          <div 
            ref={contentRef}
            className="chit-content-section"
          >
            {chits.length === 0 ? (
              <div className="empty-chest-content">
                <div className="empty-chest-icon-large">📭</div>
                <h3 className="empty-chest-title">This Chest is Empty</h3>
                <p className="empty-chest-message">
                  Your partner did not add any chits to this chest during the lock period.
                </p>
                <p className="empty-chest-hint">
                  You can still complete the reading to mark this chest as finished.
                </p>
              </div>
            ) : (
              <>
                <div className="chit-header">
                  <div className="chit-emotion">
                    <span className="emotion-icon">
                      {getEmotionIcon(currentChit.emotion)}
                    </span>
                    <span className="emotion-label">
                      {getEmotionDisplayName(currentChit.emotion)}
                    </span>
                  </div>
                  <div className="chit-number">
                    Chit {currentIndex + 1}
                  </div>
                </div>
                
                <div className="chit-content">
                  {currentChit.content}
                </div>
                
                <div className="chit-meta">
                  <span className="chit-date">
                    Written {formatDate(currentChit.createdAt)}
                  </span>
                  {currentChit.isRead && (
                    <span className="read-indicator">
                      ✓ Read
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Lower Section: Calming Message (Hidden until scroll) */}
          {chits.length > 0 && (
            <div 
              ref={messageRef}
              className={`calming-message-section ${showCalmingMessage ? 'visible' : ''}`}
            >
              <div className="section-divider"></div>
              
              <div className="calming-message-header">
                <div className="message-icon">🧘</div>
                <h3>Reading Guidance</h3>
              </div>
              
              <div className="calming-message-content">
                <p>{calmingMessage}</p>
              </div>
              
              <div className="message-instruction">
                <p>Scroll down to reveal this message. Take your time.</p>
              </div>
            </div>
          )}

          {/* Scroll Prompt (only shows if message not visible and chits exist) */}
          {!showCalmingMessage && chits.length > 0 && (
            <div className="scroll-prompt">
              <div className="prompt-icon">👇</div>
              <p>Scroll down for calming guidance</p>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="reading-navigation">
          <button
            className="nav-button prev-button"
            onClick={handlePreviousChit}
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>
          
          <div className="nav-status">
            <span className="status-text">
              {chits.length === 0 
                ? 'Empty Chest' 
                : currentIndex === chits.length - 1 
                  ? 'Last chit' 
                  : `${currentIndex + 1} of ${chits.length}`}
            </span>
          </div>
          
          <button
            className="nav-button next-button"
            onClick={handleNextChit}
          >
            {chits.length === 0 
              ? 'Finish Reading' 
              : currentIndex === chits.length - 1 
                ? 'Finish Reading' 
                : 'Next →'}
          </button>
        </div>

        {/* Reading Instructions */}
        {chits.length > 0 && (
          <div className="reading-instructions">
            <h4>Reading Guidelines</h4>
            <ul>
              <li>Read each chit fully before scrolling</li>
              <li>Scroll down for calming guidance specific to each emotion</li>
              <li>Take a breath between chits</li>
              <li>No need to respond immediately</li>
              <li>Chits must be read in order</li>
            </ul>
          </div>
        )}

        {/* Empty Chest Instructions */}
        {chits.length === 0 && (
          <div className="empty-chest-instructions">
            <h4>Empty Chest Information</h4>
            <ul>
              <li>Your partner did not add any chits during the lock period</li>
              <li>You can click "Finish Reading" to complete this chest</li>
              <li>This will allow you to start a new chest with your partner</li>
              <li>Consider discussing communication preferences with your partner</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReadChest;