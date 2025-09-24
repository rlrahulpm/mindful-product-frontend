import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { ValidateTokenResponse } from '../types/admin';
import './SetPasswordPage.css';

const SetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenData, setTokenData] = useState<ValidateTokenResponse | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No token provided');
        setValidatingToken(false);
        return;
      }

      try {
        const response = await authService.verifyToken(token);
        if (response.valid) {
          setTokenData(response);
        } else {
          setError(response.message || 'Invalid or expired token');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to validate token');
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!token) {
      setError('No token available');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.setPassword({ token, password });

      // Show success message instead of auto-login
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="set-password-container">
        <div className="set-password-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Validating token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenData || !tokenData.valid) {
    return (
      <div className="set-password-container">
        <div className="set-password-card">
          <div className="error-state">
            <span className="material-icons">error</span>
            <h2>Invalid Link</h2>
            <p>{error || 'This password setup link is invalid or has expired.'}</p>
            <button onClick={() => navigate('/login')} className="btn-primary">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="set-password-container">
        <div className="set-password-card">
          <div className="error-state">
            <span className="material-icons" style={{color: '#28a745'}}>check_circle</span>
            <h2>Password Set Successfully!</h2>
            <p>Your password has been set successfully for {tokenData.email}.</p>
            <p>You will be redirected to the login page in a few seconds.</p>
            <button onClick={() => navigate('/login')} className="btn-primary">
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="set-password-container">
      <div className="set-password-card">
        <div className="set-password-header">
          <h2>
            {tokenData.tokenType === 'SETUP' ? 'Set Up Your Password' : 'Reset Your Password'}
          </h2>
          <p className="user-email">
            <span className="material-icons">account_circle</span>
            {tokenData.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="set-password-form">
          {error && (
            <div className="error-message">
              <span className="material-icons">error</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <span className="material-icons">lock</span>
              New Password
            </label>
            <div className="password-input-container">
              <input
                type={showPasswords ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={6}
                className="form-control"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="password-toggle-btn"
                title={showPasswords ? 'Hide passwords' : 'Show passwords'}
              >
                <span className="material-icons">
                  {showPasswords ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              <span className="material-icons">lock</span>
              Confirm Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
              minLength={6}
              className="form-control"
              disabled={loading}
            />
          </div>

          <div className="password-requirements">
            <span className="material-icons">info</span>
            <div>
              <p>Password must be at least 6 characters long</p>
              <p>Choose a strong password to keep your account secure</p>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Setting Password...
                </>
              ) : (
                <>
                  <span className="material-icons">check</span>
                  Set Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordPage;