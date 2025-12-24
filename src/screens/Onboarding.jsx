import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpUser, signInUser } from '../services/auth';
import './Onboarding.css';

const Onboarding = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    gender: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (isSignUp) {
        if (!formData.username || !formData.password || !formData.gender) {
          throw new Error('All fields are required');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }

        // Sign up
        await signUpUser(formData.username, formData.password, formData.gender);
        navigate('/pairing');
      } else {
        // Sign in
        if (!formData.username || !formData.password) {
          throw new Error('Username and password are required');
        }
        
        await signInUser(formData.username, formData.password);
        navigate('/home');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <video
        className="bg-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/onboarding-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="onboarding-card">
        {/* <div className="app-header">
          <h1 className="app-title">The Chest</h1>
        </div> */}

        <div className="auth-tabs">
          <button
            className={`tab ${isSignUp ? 'active' : ''}`}
            onClick={() => setIsSignUp(true)}
          >
            Sign Up
          </button>
          <button
            className={`tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => setIsSignUp(false)}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a unique username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              required
              disabled={loading}
            />
          </div>

          {isSignUp && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <div className="gender-options">
                  <label className="gender-option">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    <span className="gender-icon" aria-hidden="true">
                      <i className="bi bi-gender-male"></i>
                    </span>
                  </label>
                  <label className="gender-option">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    <span className="gender-icon" aria-hidden="true">
                      <i className="bi bi-gender-female"></i>
                    </span>
                  </label>
                </div>

              </div>
            </>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* <div className="auth-switch">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="switch-button"
                onClick={() => setIsSignUp(false)}
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Need an account?{' '}
              <button
                type="button"
                className="switch-button"
                onClick={() => setIsSignUp(true)}
              >
                Sign Up
              </button>
            </p>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default Onboarding;