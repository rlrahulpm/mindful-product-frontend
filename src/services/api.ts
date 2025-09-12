import axios from 'axios';
import { shouldRefreshToken, isTokenExpired } from '../utils/jwtUtils';
import { logger } from '../utils/logger';
import { config } from '../config';

const API_BASE_URL = config.api.baseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.request.use(
  async (config) => {
    const startTime = performance.now();
    (config as any).metadata = { startTime };
    
    logger.apiRequest(config.method?.toUpperCase() || 'GET', config.url || '');
    
    // Skip token refresh for auth endpoints
    if (config.url?.includes('/auth/')) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }

    const token = localStorage.getItem('token');
    if (token) {
      if (isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject('Token expired');
      }

      // Check if token needs refresh
      if (shouldRefreshToken(token)) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            config.headers.Authorization = `Bearer ${newToken}`;
            return config;
          });
        }

        isRefreshing = true;

        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const newToken = response.data.token;
          const userData = {
            id: response.data.userId,
            email: response.data.email,
            isSuperadmin: response.data.isSuperadmin
          };

          localStorage.setItem('token', newToken);
          localStorage.setItem('user', JSON.stringify(userData));

          processQueue(null, newToken);
          config.headers.Authorization = `Bearer ${newToken}`;

          return config;
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const endTime = performance.now();
    const startTime = (response.config as any)?.metadata?.startTime;
    const duration = startTime ? endTime - startTime : undefined;
    
    logger.apiResponse(
      response.config?.method?.toUpperCase() || 'GET',
      response.config?.url || '',
      response.status,
      duration
    );
    
    return response;
  },
  async (error) => {
    logger.apiError(
      error.config?.method?.toUpperCase() || 'GET',
      error.config?.url || '',
      error
    );
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip retry for auth endpoints to avoid infinite loops
      if (originalRequest.url?.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      const token = localStorage.getItem('token');
      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const newToken = response.data.token;
        const userData = {
          id: response.data.userId,
          email: response.data.email,
          isSuperadmin: response.data.isSuperadmin
        };

        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;