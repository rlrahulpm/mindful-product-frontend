import { logger } from './logger';
import { AxiosError } from 'axios';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

export class CustomError extends Error implements AppError {
  public code?: string;
  public statusCode?: number;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    code?: string,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CustomError';
    this.code = code || undefined;
    this.statusCode = statusCode || undefined;
    this.context = context || undefined;
  }
}

export class ApiError extends CustomError {
  constructor(message: string, statusCode: number, context?: Record<string, unknown>) {
    super(message, 'API_ERROR', statusCode, context);
    this.name = 'ApiError';
  }
}

export class NetworkError extends CustomError {
  constructor(message: string = 'Network connection failed', context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 0, context);
    this.name = 'NetworkError';
  }
}

export class AuthError extends CustomError {
  constructor(message: string = 'Authentication failed', context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, context);
    this.name = 'AuthError';
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export const handleApiError = (error: unknown): AppError => {
  logger.error('API Error occurred', error as Error);

  if (error instanceof CustomError) {
    return error;
  }

  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    
    if (axiosError.code === 'NETWORK_ERROR' || axiosError.message === 'Network Error') {
      return new NetworkError('Unable to connect to server. Please check your internet connection.');
    }

    const status = axiosError.response?.status;
    const data = axiosError.response?.data as any;
    
    switch (status) {
      case 400:
        return new ValidationError(
          data?.message || 'Invalid request data',
          { originalError: axiosError.message }
        );
      
      case 401:
        return new AuthError(
          data?.message || 'You are not authorized to access this resource',
          { originalError: axiosError.message }
        );
      
      case 403:
        return new CustomError(
          data?.message || 'You do not have permission to perform this action',
          'FORBIDDEN_ERROR',
          403,
          { originalError: axiosError.message }
        );
      
      case 404:
        return new CustomError(
          data?.message || 'The requested resource was not found',
          'NOT_FOUND_ERROR',
          404,
          { originalError: axiosError.message }
        );
      
      case 422:
        return new ValidationError(
          data?.message || 'The provided data is invalid',
          { 
            originalError: axiosError.message,
            validationErrors: data?.errors 
          }
        );
      
      case 500:
        return new CustomError(
          'An internal server error occurred. Please try again later.',
          'SERVER_ERROR',
          500,
          { originalError: axiosError.message }
        );
      
      default:
        return new ApiError(
          data?.message || axiosError.message || 'An unexpected error occurred',
          status || 500,
          { originalError: axiosError.message }
        );
    }
  }

  if (error instanceof Error) {
    return new CustomError(
      error.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500,
      { originalError: error.message }
    );
  }

  return new CustomError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: String(error) }
  );
};

export const getErrorMessage = (error: unknown): string => {
  const appError = handleApiError(error);
  return appError.message;
};

export const isAuthError = (error: unknown): boolean => {
  return error instanceof AuthError || 
         (error as any)?.statusCode === 401 ||
         (error as any)?.code === 'AUTH_ERROR';
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> => {
  try {
    const result = await operation();
    if (context) {
      logger.debug(`Operation successful: ${context}`);
    }
    return result;
  } catch (error) {
    if (context) {
      logger.error(`Operation failed: ${context}`, error as Error);
    }
    throw handleApiError(error);
  }
};