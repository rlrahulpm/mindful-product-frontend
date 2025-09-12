import { logger } from './logger';

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .trim()
    .slice(0, 1000); // Limit length
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const isStrongPassword = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
};

export const sanitizeUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      logger.warn('Invalid URL protocol attempted', { url: url.substring(0, 50) });
      return null;
    }
    return urlObj.toString();
  } catch {
    logger.warn('Invalid URL format attempted', { url: url.substring(0, 50) });
    return null;
  }
};

export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const secureLocalStorage = {
  setItem: (key: string, value: string): void => {
    try {
      if (typeof Storage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      logger.error('Failed to set localStorage item', error as Error, { key });
    }
  },

  getItem: (key: string): string | null => {
    try {
      if (typeof Storage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get localStorage item', error as Error, { key });
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof Storage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error('Failed to remove localStorage item', error as Error, { key });
    }
  },

  clear: (): void => {
    try {
      if (typeof Storage !== 'undefined') {
        localStorage.clear();
      }
    } catch (error) {
      logger.error('Failed to clear localStorage', error as Error);
    }
  },
};

export const preventXSS = (input: unknown): string => {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const createSecureHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};

// Rate limiting for client-side requests
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { key, requestCount: validRequests.length });
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new RateLimiter();