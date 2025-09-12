import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { User, AuthContextType } from '../types/auth';
import { authService } from '../services/authService';
import { productService } from '../services/productService';
import { shouldRefreshToken, isTokenExpired } from '../utils/jwtUtils';
import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/errorHandler';

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

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      logger.userAction('login_attempt', { email: email.substring(0, 3) + '***' });
      
      // Clear product cache when switching users
      productService.clearCache();
      
      const response = await withErrorHandling(
        () => authService.login({ email, password }),
        'user_login'
      );
      
      const userData = { id: response.userId, email: response.email, isSuperadmin: response.isSuperadmin };
      
      authService.setAuthToken(response.token);
      authService.setStoredUser(userData);
      
      setToken(response.token);
      setUser(userData);
      
      scheduleTokenRefresh();
      logger.userAction('login_success', { userId: response.userId });
    } catch (error) {
      logger.error('Login failed', error as Error, { email: email.substring(0, 3) + '***' });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);


  const logout = useCallback(() => {
    logger.userAction('logout', { userId: user?.id });
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Clear product cache when logging out
    productService.clearCache();
    
    authService.removeAuthToken();
    setToken(null);
    setUser(null);
    authService.logout().catch((error) => {
      logger.warn('Logout request failed', { error: error.message });
    });
  }, [user?.id]);

  const value: AuthContextType = useMemo(() => ({
    user,
    token,
    login,
    logout,
    isLoading,
  }), [user, token, login, logout, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};