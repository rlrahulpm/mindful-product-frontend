import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, AuthContextType } from '../types/auth';
import { authService } from '../services/authService';
import { productService } from '../services/productService';
import { shouldRefreshToken, isTokenExpired } from '../utils/jwtUtils';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshTokenIfNeeded = async () => {
    const currentToken = authService.getStoredToken();
    if (!currentToken) return;

    if (isTokenExpired(currentToken)) {
      logout();
      return;
    }

    if (shouldRefreshToken(currentToken)) {
      try {
        const response = await authService.refreshToken();
        const userData = { id: response.userId, email: response.email, isSuperadmin: response.isSuperadmin };
        
        authService.setAuthToken(response.token);
        authService.setStoredUser(userData);
        
        setToken(response.token);
        setUser(userData);
        
      } catch (error) {
        logout();
      }
    }
  };

  const scheduleTokenRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Check every 5 minutes for token refresh (was 2 minutes)
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTokenIfNeeded();
      scheduleTokenRefresh();
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    const storedToken = authService.getStoredToken();
    const storedUser = authService.getStoredUser();
    
    if (storedToken && storedUser && !isTokenExpired(storedToken)) {
      setToken(storedToken);
      setUser(storedUser);
      scheduleTokenRefresh();
    } else if (storedToken && isTokenExpired(storedToken)) {
      authService.removeAuthToken();
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Clear product cache when switching users
      productService.clearCache();
      
      const response = await authService.login({ email, password });
      const userData = { id: response.userId, email: response.email, isSuperadmin: response.isSuperadmin };
      
      authService.setAuthToken(response.token);
      authService.setStoredUser(userData);
      
      setToken(response.token);
      setUser(userData);
      
      scheduleTokenRefresh();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  const logout = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Clear product cache when logging out
    productService.clearCache();
    
    authService.removeAuthToken();
    setToken(null);
    setUser(null);
    authService.logout().catch(() => {});
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};