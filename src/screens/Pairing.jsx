import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { initiatePairing, checkPairingStatus } from '../services/pairing';
import { getUserProfile } from '../services/auth';
import './Pairing.css';

const Pairing = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [partnerUsername, setPartnerUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [currentUserGender, setCurrentUserGender] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
  const checkStatus = async () => {
    try {
      console.log('1. Starting status check...');
      
      if (!user?.uid) {
        console.log('2. No user ID found, redirecting to login');
        navigate('/');
        return;
      }

      // Check pairing status
      console.log('3. Checking pairing status...');
      const status = await checkPairingStatus(user.uid);
      console.log('4. Pairing status result:', status);
      
      if (status.isPaired) {
        console.log('5. User is already paired, redirecting to home');
        navigate('/home');
        return; // IMPORTANT: Return here to stop execution
      }

      // Get current user's gender for guidance
      let userGender = profile?.gender;
      if (!userGender) {
        console.log('6. Fetching user profile for gender...');
        const userProfile = await getUserProfile(user.uid);
        userGender = userProfile?.gender;
      }

      if (userGender) {
        setCurrentUserGender(userGender);
        setInfo(`You are ${userGender}. You can only pair with someone of opposite gender.`);
      } else {
        console.log('7. No gender found, redirecting to onboarding');
        navigate('/');
      }

    } catch (err) {
      console.error('Error in pairing check:', err);
      setError(`Error: ${err.message}`);
    } finally {
      console.log('8. Setting loading to false');
      setLoading(false); // THIS MUST BE CALLED!
    }
  };

  checkStatus();
}, [user, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    setDebugInfo('Starting pairing process...');

    if (!partnerUsername.trim()) {
      setError('Please enter your partner\'s username');
      setLoading(false);
      return;
    }

    try {
      setDebugInfo(`Attempting to pair with: ${partnerUsername.trim()}`);
      const result = await initiatePairing(user.uid, partnerUsername.trim());
      
      setInfo(`Successfully paired with ${result.partnerUsername}! This pairing is permanent.`);
      setDebugInfo('Pairing successful!');
      
      setTimeout(() => {
        navigate('/home');
      }, 2000);

    } catch (err) {
      console.error('Pairing error:', err);
      setError(err.message);
      setDebugInfo(`Pairing failed: ${err.message}`);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="pairing-container">
        <div className="pairing-card">
          <div className="pairing-header">
            <h1 className="pairing-title">Loading...</h1>
          </div>
          <div className="debug-info">
            <p><strong>Debug Info:</strong></p>
            <pre>{debugInfo}</pre>
            <p>User ID: {user?.uid || 'No user'}</p>
            <p>Profile exists: {profile ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pairing-container">
      <div className="pairing-card">
        <div className="pairing-header">
          <h1 className="pairing-title">Pair with Partner</h1>
          <p className="pairing-subtitle">
            This pairing is permanent and cannot be changed
          </p>
        </div>

        {/* Debug Info (remove in production) */}
        <div className="debug-info" style={{ display: 'none' }}>
          <p><strong>Debug Info:</strong> {debugInfo}</p>
          <p><strong>User:</strong> {user?.uid}</p>
          <p><strong>Gender:</strong> {currentUserGender}</p>
        </div>

        {/* <div className="pairing-warning">
          <div className="warning-icon">⚠️</div>
          <p>
            <strong>Important:</strong> Once paired, you cannot un-pair or change partners. 
            Choose carefully.
          </p>
        </div>

        {currentUserGender && (
          <div className="gender-info">
            <p>Your gender: <strong>{currentUserGender}</strong></p>
            <p>You must pair with someone of opposite gender.</p>
          </div>
        )} */}

        <form onSubmit={handleSubmit} className="pairing-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {info && (
            <div className="success-message">
              {info}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="partnerUsername">Partner's Username</label>
            <input
              type="text"
              id="partnerUsername"
              value={partnerUsername}
              onChange={(e) => setPartnerUsername(e.target.value)}
              placeholder="Enter your partner's exact username"
              required
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
            <p className="input-hint">
              Make sure you have the exact username. Case sensitive.
            </p>
          </div>

          <div className="pairing-rules">
            <h3>Pairing Rules:</h3>
            <ul>
              <li>Username must exist</li>
              <li>Must be opposite gender</li>
              <li>Both users must be unpaired</li>
              <li>Cannot pair with same person again</li>
              <li>No unpairing or changes allowed</li>
            </ul>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pair-button"
              disabled={loading || !partnerUsername.trim()}
            >
              {loading ? 'Pairing...' : 'Confirm Pairing'}
            </button>
          </div>
        </form>

        {/* <div className="pairing-help">
          <p>
            <strong>Need help?</strong> Make sure your partner has:
          </p>
          <ul>
            <li>Created an account</li>
            <li>Selected their gender</li>
            <li>Not paired with anyone else</li>
          </ul>
        </div> */}
      </div>
    </div>
  );
};

export default Pairing;