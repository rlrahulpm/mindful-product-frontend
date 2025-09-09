import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-visual">
            <div className="visual-card">
              <div className="visual-title">YOUR</div>
              <div className="visual-subtitle">PRODUCT</div>
              <div className="visual-subtitle">JOURNEY</div>
              <div className="visual-year">BEGINS HERE</div>
            </div>
          </div>
        </div>
        
        <div className="auth-right">
          <button 
            onClick={() => navigate('/')} 
            className="close-button"
            aria-label="Close"
          >
            ×
          </button>
          
          <div className="auth-form-container">
            <div className="form-header">
              <h1 className="form-title">Sign In</h1>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email:</label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">Password:</label>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              {error && <div className="alert alert-error">{error}</div>}
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="auth-submit"
              >
                {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>
            
            <div className="auth-footer">
              <p className="auth-note">
                Contact your administrator for account access
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;