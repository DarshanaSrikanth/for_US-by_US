import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addChit } from '../services/chits';
import { getChestById } from '../services/chest';
import { getPartnerInfo } from '../services/pairing';
import { VALID_EMOTIONS, isValidEmotion } from '../services/chits';
import Header from '../components/shared/Header';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import './AddChit.css';

const AddChit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [chestId, setChestId] = useState(null);
  const [chestData, setChestData] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    content: '',
    emotion: ''
  });
  
  const [charCount, setCharCount] = useState(0);
  const MAX_CHARS = 1000;

  useEffect(() => {
    const initialize = async () => {
      if (!user || !profile) return;

      try {
        setLoading(true);
        
        // Get chest ID from location state or params
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
        
        // Check if chest is active
        if (chest.status !== 'active') {
          throw new Error('Cannot add chits to a chest that is not active');
        }
        
        // Check if user is authorized
        if (chest.userId1 !== user.uid && chest.userId2 !== user.uid) {
          throw new Error('You are not authorized to add chits to this chest');
        }
        
        // Load partner info
        const partnerId = chest.userId1 === user.uid ? chest.userId2 : chest.userId1;
        const partner = await getPartnerInfo(partnerId);
        setPartnerInfo(partner);
        
      } catch (err) {
        console.error('Error initializing AddChit:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user, profile, location]);

  const handleContentChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setFormData(prev => ({ ...prev, content: value }));
      setCharCount(value.length);
    }
  };

  const handleEmotionChange = (emotion) => {
    setFormData(prev => ({ ...prev, emotion }));
  };

  const validateForm = () => {
    if (!formData.content.trim()) {
      return 'Chit content cannot be empty';
    }
    
    if (!formData.emotion) {
      return 'Please select an emotion';
    }
    
    if (!isValidEmotion(formData.emotion)) {
      return 'Please select a valid emotion';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      await addChit(
        chestId,
        user.uid,
        formData.content.trim(),
        formData.emotion
      );
      
      setSuccess('Chit added successfully!');
      
      // Clear form
      setFormData({
        content: '',
        emotion: ''
      });
      setCharCount(0);
      
      // Navigate back after delay
      setTimeout(() => {
        navigate('/home');
      }, 1500);
      
    } catch (err) {
      console.error('Error adding chit:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/home');
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

  if (loading) {
    return (
      <div className="addchit-container">
        <Header title="Add Chit" showBack={true} backPath="/home" />
        <div className="addchit-loading">
          <LoadingSpinner size="large" text="Loading..." />
        </div>
      </div>
    );
  }

  if (error && !chestData) {
    return (
      <div className="addchit-container">
        <Header title="Add Chit" showBack={true} backPath="/home" />
        <div className="addchit-error">
          <div className="error-message">{error}</div>
          <button className="action-button" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="addchit-container">
      <Header title="Add Chit" showBack={true} backPath="/home" />
      
      <main className="addchit-content">
        <div className="addchit-header">
          <h2>Add a Chit</h2>
          <p>Share your thoughts with your partner</p>
        </div>

        {chestData && (
          <div className="chest-info">
            <div className="chest-info-item">
              <span className="label">Chest Status:</span>
              <span className="value">{chestData.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="chest-info-item">
              <span className="label">Unlocks:</span>
              <span className="value">
                {chestData.unlockDate?.toLocaleDateString()} at {chestData.unlockDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {partnerInfo && (
              <div className="chest-info-item">
                <span className="label">For:</span>
                <span className="value partner-name">{partnerInfo.username}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="addchit-form">
          <div className="form-section">
            <label htmlFor="content" className="section-label">
              What would you like to share?
              <span className="label-note">Your partner will read this when the chest unlocks</span>
            </label>
            
            <textarea
              id="content"
              value={formData.content}
              onChange={handleContentChange}
              placeholder="Write your thoughts here... Be honest and thoughtful."
              className="content-input"
              rows={6}
              disabled={submitting}
              autoFocus
            />
            
            <div className="char-counter">
              <span className={charCount > MAX_CHARS * 0.9 ? 'warning' : ''}>
                {charCount}
              </span>
              <span> / {MAX_CHARS} characters</span>
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">
              How are you feeling about this?
              <span className="label-note">This helps your partner understand your emotional state</span>
            </label>
            
            <div className="emotion-selection">
              {VALID_EMOTIONS.map(emotion => (
                <button
                  key={emotion}
                  type="button"
                  className={`emotion-option ${formData.emotion === emotion ? 'selected' : ''}`}
                  onClick={() => handleEmotionChange(emotion)}
                  disabled={submitting}
                >
                  <span className="emotion-icon">{getEmotionIcon(emotion)}</span>
                  <span className="emotion-name">{getEmotionDisplayName(emotion)}</span>
                </button>
              ))}
            </div>
            
            {formData.emotion && (
              <div className="selected-emotion">
                <strong>Selected:</strong> {getEmotionIcon(formData.emotion)} {getEmotionDisplayName(formData.emotion)}
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Important Notes</h3>
            <div className="notes-list">
              <div className="note-item">
                <div className="note-icon">⚠️</div>
                <div className="note-content">
                  <strong>No editing or deletion:</strong> Once submitted, chits cannot be changed or removed.
                </div>
              </div>
              <div className="note-item">
                <div className="note-icon">🔒</div>
                <div className="note-content">
                  <strong>Time-locked:</strong> Your partner will read this only after the chest unlocks.
                </div>
              </div>
              <div className="note-item">
                <div className="note-icon">👁️</div>
                <div className="note-content">
                  <strong>You cannot read your own chits:</strong> This encourages honest sharing.
                </div>
              </div>
              <div className="note-item">
                <div className="note-icon">💭</div>
                <div className="note-content">
                  <strong>Emotion labeling:</strong> Helps your partner understand the context.
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="action-button secondary"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="action-button primary"
              disabled={submitting || !formData.content.trim() || !formData.emotion}
            >
              {submitting ? 'Adding Chit...' : 'Add Chit'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddChit;