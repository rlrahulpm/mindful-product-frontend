import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SuperadminRouteProps {
  children: React.ReactElement;
}

const SuperadminRoute: React.FC<SuperadminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isSuperadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default SuperadminRoute;