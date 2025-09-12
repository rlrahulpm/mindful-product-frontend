const getEnvVar = (name: string, fallback: string): string => {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    console.warn(`Missing required environment variable: ${name}`);
  }
  return value || fallback;
};

export const API_BASE_URL = getEnvVar('REACT_APP_API_URL', 'http://localhost:8080/api');

export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 10000,
    retries: 3,
  },
  app: {
    name: 'Mindful Product Frontend',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.REACT_APP_ENABLE_DEBUG === 'true',
  },
  auth: {
    tokenRefreshThreshold: 5 * 60 * 1000,
    maxRetries: 3,
  }
} as const;