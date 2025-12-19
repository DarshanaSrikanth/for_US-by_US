import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getActiveChest, checkChestUnlockable, createChest, canStartNewChest } from '../services/chest';
import { getPartnerInfo } from '../services/pairing';
import { getUserSettings } from '../services/settings';
import Header from '../components/shared/Header';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ChestVisual from '../components/chest/ChestVisual';
import './Home.css';

import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config"; // adjust path if needed

const isDev=import.meta.env.DEV;

const Home = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screenState, setScreenState] = useState('loading'); // 'A' | 'B' | 'C' | 'D' | 'loading' | 'error'
  const [chestData, setChestData] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [unlockInfo, setUnlockInfo] = useState(null);
  const [isCreatingChest, setIsCreatingChest] = useState(false);
  const [currentChestId, setCurrentChestId] = useState(null); // ✅ declare state


  useEffect(() => {
    loadHomeData();
  }, [user, profile]);

  const loadHomeData = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      setError('');

      // Load partner info
      if (profile.pairedUserId) {
        const partner = await getPartnerInfo(profile.pairedUserId);
        setPartnerInfo(partner);
      }

      // Load user settings
      const userSettings = await getUserSettings(user.uid);
      setSettings(userSettings);

      // Check for active chest
      if (profile.pairedUserId) {
        const activeChest = await getActiveChest(user.uid, profile.pairedUserId);
        
        if (activeChest) {
          setChestData(activeChest); 
          setCurrentChestId(activeChest.id);         
          // Check if chest is unlockable
          const unlockCheck = await checkChestUnlockable(activeChest.id);
          setUnlockInfo(unlockCheck);
          
          // Determine screen state
          if (activeChest.status === 'active') {
            setScreenState('C'); // Active chest, locked
          } else if (activeChest.status === 'unlockable' || unlockCheck.isUnlockable) {
            setScreenState('D'); // Chest unlockable
          } else if (activeChest.status === 'completed') {
            setScreenState('B'); // Chest completed, can start new one
          } else {
            setScreenState('B'); // Fallback
          }
        } else {
          // No active chest
          setScreenState('B');
        }
      } else {
        // Not paired
        setScreenState('A');
      }

    } catch (err) {
      console.error('Error loading home data:', err);
      setError('Failed to load data. Please try again.');
      setScreenState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChest = async () => {
    if (!profile?.pairedUserId || !settings) return;

    try {
      setIsCreatingChest(true);
      setError('');

      // Check if we can start a new chest
      const canStart = await canStartNewChest(user.uid, profile.pairedUserId);
      if (!canStart.canStart) {
        throw new Error('Cannot start new chest while another is active');
      }

      // Create new chest
      const durationInMinutes = isDev ? 1 : (settings.chestDuration * 1440);

      await createChest(
        user.uid,
        profile.pairedUserId,
        durationInMinutes
      );

      // await createChest(user.uid, profile.pairedUserId, settings.chestDuration);
      
      // Reload data
      await loadHomeData();

    } catch (err) {
      console.error('Error starting new chest:', err);
      setError(err.message);
    } finally {
      setIsCreatingChest(false);
    }
  };

  const handleOpenChest = () => {
    if (chestData) {
      navigate('/read-chest', { state: { chestId: chestData.id } });
    }
  };

  const handleAddChit = () => {
    if (chestData) {
      navigate('/add-chit', { state: { chestId: chestData.id } });
    }
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const handleGoToPairing = () => {
    navigate('/pairing');
  };

  const handleGoToHistory = () => {
    navigate('/history');
  };

  //Delete Function added
    const handleDelete = async () => {
    if (!currentChestId) {
      alert("No chest to delete");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete the current chest? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "chests", currentChestId));
      alert("Chest deleted successfully!");
      
      // Reset ALL relevant states after deletion
      setCurrentChestId(null);
      setChestData(null);
      setUnlockInfo(null);
      // Force a reload to move to state B (no active chest)
      await loadHomeData();
      
    } catch (error) {
      console.error("Delete error:", error);
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        alert("Permission denied. Check your Firestore security rules.");
      } else {
        alert("Failed to delete chest. Check console for details.");
      }
    }
  };


  if (loading) {
    return (
      <div className="home-container">
        <Header title="The Chest" />
        <div className="home-loading">
          <LoadingSpinner size="large" text="Loading your chest..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <Header title="The Chest" />
        <div className="home-error">
          <div className="error-message">{error}</div>
          <button className="retry-button" onClick={loadHomeData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <Header title="The Chest" />
        {isDev && (
        <div className="dev-badge">
          DEV MODE — Chest unlocks in 1 minute
        </div>
      )}
      <main className="home-content">
        {/* State A: Not Paired */}
        {screenState === 'A' && (
          <div className="home-state-a">
            <div className="state-header">
              <h2>Welcome to The Chest</h2>
              <p>Start your journey of thoughtful sharing</p>
            </div>
            
            <div className="state-content">
              <div className="illustration">
                <div className="illustration-icon">📦</div>
              </div>
              
              <div className="state-message">
                <p>You need to pair with a partner to begin.</p>
                <p>The Chest helps couples share emotions thoughtfully over time.</p>
              </div>
              
              <button 
                className="action-button primary"
                onClick={handleGoToPairing}
              >
                Find a Partner
              </button>
              
              <div className="state-instructions">
                <h3>How it works:</h3>
                <ol>
                  <li>Pair with your partner (permanent)</li>
                  <li>Start a chest with a time lock</li>
                  <li>Write chits with emotions</li>
                  <li>Wait for the chest to unlock</li>
                  <li>Read each other's chits thoughtfully</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* State B: Paired, No Active Chest */}
        {screenState === 'B' && (
          <div className="home-state-b">
            <div className="state-header">
              <h2>Welcome back, {profile?.username}</h2>
              <p>Paired with: <strong>{partnerInfo?.username}</strong></p>
            </div>
            
            <div className="state-content">
              <ChestVisual state="closed" />
              
              <div className="state-message">
                <p>No active chest. Start a new one to begin sharing.</p>
                <p className="settings-note">
                  Current settings: Chest duration is <strong>{settings?.chestDuration} days</strong>
                </p>
              </div>
              
              <div className="action-buttons">
                <button 
                  className="action-button primary"
                  onClick={handleStartNewChest}
                  disabled={isCreatingChest}
                >
                  {isCreatingChest ? 'Creating Chest...' : 'Start New Chest'}
                </button>
                
                <button 
                  className="action-button secondary"
                  onClick={handleGoToSettings}
                >
                  Settings
                </button>
                
                <button 
                  className="action-button secondary"
                  onClick={handleGoToHistory}
                >
                  History
                </button>
              </div>
              
              {partnerInfo && (
                <div className="partner-info-card">
                  <h3>Your Partner</h3>
                  <div className="partner-details">
                    <div className="partner-detail">
                      <span>Username:</span>
                      <strong>{partnerInfo.username}</strong>
                    </div>
                    <div className="partner-detail">
                      <span>Gender:</span>
                      <strong>{partnerInfo.gender}</strong>
                    </div>
                    <div className="partner-detail">
                      <span>Paired since:</span>
                      <strong>
                        {partnerInfo.pairedSince 
                          ? new Date(partnerInfo.pairedSince).toLocaleDateString() 
                          : 'Recently'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State C: Active Chest (Locked) */}
        {screenState === 'C' && chestData && (
          <div className="home-state-c">
            <div className="state-header">
              <h2>Active Chest</h2>
              <p>Locked until unlock time</p>
            </div>
            
            <div className="state-content">
              <ChestVisual state="locked" unlockDate={chestData.unlockDate} />
              
              <div className="time-info">
                <div className="time-item">
                  <span className="time-label">Started:</span>
                  <span className="time-value">
                    {chestData.startDate?.toLocaleDateString()} at {chestData.startDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="time-item">
                  <span className="time-label">Unlocks:</span>
                  <span className="time-value highlight">
                    {chestData.unlockDate?.toLocaleDateString()} at {chestData.unlockDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {unlockInfo && (
                  <div className="time-item">
                    <span className="time-label">Time remaining:</span>
                    <span className="time-value">
                      {unlockInfo.daysRemaining > 0 
                        ? `${unlockInfo.daysRemaining} day${unlockInfo.daysRemaining !== 1 ? 's' : ''}`
                        : 'Unlocks today!'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="state-message">
                <p>Your chest is locked. You can add chits, but cannot read until it unlocks.</p>
                <p className="note">Settings are disabled while chest is active.</p>
              </div>
              
              <div className="action-buttons">
                <button 
                  className="action-button primary"
                  onClick={handleAddChit}
                >
                  Add Chit
                </button>
                
                <button 
                  className="action-button secondary"
                  onClick={handleGoToHistory}
                  disabled={true}
                  title="Settings disabled while chest is active"
                >
                  Settings
                </button>
              </div>
              {/* DEV ONLY: Delete Chest */}
              {isDev && (
                <button
                  className="action-button danger"
                  onClick={handleDelete}
                >
                  Delete Chest (Dev Only)
                </button>
              )}
            </div>
          </div>
        )}

        {/* State D: Chest Unlockable */}
        {screenState === 'D' && chestData && (
          <div className="home-state-d">
            <div className="state-header">
              <h2>Chest is Ready!</h2>
              <p>Time to discover what's inside</p>
            </div>
            
            <div className="state-content">
              <ChestVisual state="unlocked" />
              
              <div className="unlock-message">
                <div className="unlock-icon">🔓</div>
                <h3>Chest has unlocked!</h3>
                <p>You can now read your partner's chits.</p>
                <p className="note">Take your time and read thoughtfully.</p>
              </div>
              
              <div className="action-buttons">
                <button 
                  className="action-button primary large"
                  onClick={handleOpenChest}
                >
                  Open Chest
                </button>
              </div>
              
              <div className="guidance-note">
                <h4>Reading Guidance:</h4>
                <ul>
                  <li>Read chits one at a time, in order</li>
                  <li>Take deep breaths between chits</li>
                  <li>Scroll down for calming guidance</li>
                  <li>No reactions required immediately</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {screenState === 'error' && (
          <div className="home-error-state">
            <div className="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>We couldn't load your chest data.</p>
            <button className="action-button" onClick={loadHomeData}>
              Try Again
            </button>
          </div>
        )}
      </main>
      
      <footer className="home-footer">
        <p className="footer-note">
          The Chest • Thoughtful emotional sharing • {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default Home;