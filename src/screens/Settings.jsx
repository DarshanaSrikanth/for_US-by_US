import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserSettings, updateUserSettings, canEditSettings } from '../services/settings';
import { getPartnerInfo } from '../services/pairing';
import Header from '../components/shared/Header';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [editable, setEditable] = useState(true);
  const [editableReason, setEditableReason] = useState('');
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [formData, setFormData] = useState({
    chestDuration: 7
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, [user, profile]);

  const loadSettings = async () => {
  if (!user || !profile) return;

  try {
    setLoading(true);
    
    // Load settings
    const userSettings = await getUserSettings(user.uid);
    setSettings(userSettings);
    setFormData({
      chestDuration: userSettings.chestDuration
    });

    // Check if settings can be edited
    if (profile.pairedUserId) {
      const partner = await getPartnerInfo(profile.pairedUserId);
      setPartnerInfo(partner);
      
      try {
        const canEdit = await canEditSettings(user.uid, profile.pairedUserId);
        setEditable(canEdit.canEdit);
        setEditableReason(canEdit.reason);
      } catch (canEditError) {
        console.warn('Could not check edit permissions:', canEditError);
        // Default to editable on error
        setEditable(true);
        setEditableReason('Could not verify chest status. You may edit settings.');
      }
    } else {
      // Not paired, always editable
      setEditable(true);
      setEditableReason(null);
    }

  } catch (error) {
    console.error('Error loading settings:', error);
    
    // More specific error messages
    if (error.message.includes('permission-denied')) {
      setErrors({ general: 'Permission denied. Please check Firestore rules.' });
    } else if (error.message.includes('collection is not defined')) {
      setErrors({ general: 'Configuration error. Please check imports.' });
    } else {
      setErrors({ general: 'Failed to load settings. Please try again.' });
    }
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.chestDuration || formData.chestDuration < 1 || formData.chestDuration > 58) {
      newErrors.chestDuration = 'Chest duration must be between 1 and 30 days';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editable) {
      setErrors({ general: editableReason });
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});
      setSuccessMessage('');

      await updateUserSettings(user.uid, {
        chestDuration: formData.chestDuration
      });

      setSuccessMessage('Settings saved successfully!');
      
      // Update local settings
      setSettings(prev => ({
        ...prev,
        chestDuration: formData.chestDuration
      }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error saving settings:', error);
      setErrors({ general: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setFormData({
      chestDuration: 7
    });
    setErrors({});
  };

  const handleGoBack = () => {
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="settings-container">
        <Header title="Settings" showBack={true} backPath="/home" />
        <div className="settings-loading">
          <LoadingSpinner size="large" text="Loading settings..." />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <Header title="Settings" showBack={true} backPath="/home" />
      
      <main className="settings-content">
        <div className="settings-header">
          <h2>Application Settings</h2>
          <p>Configure how The Chest works for you</p>
        </div>

        {!editable && (
          <div className="settings-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Settings Locked</strong>
              <p>{editableReason}</p>
              <p className="warning-note">You can only change settings when no chest is active.</p>
            </div>
          </div>
        )}

        {partnerInfo && (
          <div className="partner-section">
            <h3>Pairing Information</h3>
            <div className="partner-details">
              <div className="partner-detail">
                <span>Partner:</span>
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

        <form onSubmit={handleSubmit} className="settings-form">
          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          <div className="settings-section">
            <h3>Chest Configuration</h3>
            
            <div className="form-group">
              <label htmlFor="chestDuration">
                Chest Duration (days)
                <span className="label-description">
                  How long a chest stays locked before it can be opened
                </span>
              </label>
              
              <div className="duration-input-group">
                <input
                  type="range"
                  id="chestDuration"
                  name="chestDuration"
                  min="1"
                  max="48"
                  step="1"
                  value={formData.chestDuration}
                  onChange={handleInputChange}
                  disabled={!editable || saving}
                  className="duration-slider"
                />
                
                <div className="duration-value-display">
                  <span className="duration-value">{formData.chestDuration}</span>
                  <span className="duration-unit">days</span>
                </div>
              </div>
              
              {errors.chestDuration && (
                <div className="field-error">{errors.chestDuration}</div>
              )}
              
              <div className="duration-presets">
                <button
                  type="button"
                  className={`duration-preset ${formData.chestDuration === 1 ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, chestDuration: 1 }))}
                  disabled={!editable || saving}
                >
                  1 day
                </button>
                <button
                  type="button"
                  className={`duration-preset ${formData.chestDuration === 3 ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, chestDuration: 3 }))}
                  disabled={!editable || saving}
                >
                  3 days
                </button>
                <button
                  type="button"
                  className={`duration-preset ${formData.chestDuration === 7 ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, chestDuration: 7 }))}
                  disabled={!editable || saving}
                >
                  7 days
                </button>
                <button
                  type="button"
                  className={`duration-preset ${formData.chestDuration === 14 ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, chestDuration: 14 }))}
                  disabled={!editable || saving}
                >
                  14 days
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Current Configuration</h3>
            <div className="current-settings">
              <div className="current-setting">
                <span className="setting-label">Chest Duration:</span>
                <span className="setting-value">{settings?.chestDuration} days</span>
              </div>
              <div className="current-setting">
                <span className="setting-label">Settings Status:</span>
                <span className={`setting-value ${editable ? 'editable' : 'locked'}`}>
                  {editable ? 'Editable' : 'Locked'}
                </span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="action-button secondary"
              onClick={handleResetToDefaults}
              disabled={!editable || saving}
            >
              Reset to Defaults
            </button>
            
            <button
              type="button"
              className="action-button secondary"
              onClick={handleGoBack}
              disabled={saving}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="action-button primary"
              disabled={!editable || saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Settings;