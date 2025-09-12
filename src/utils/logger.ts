import { config } from '../config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = config.app.debug ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatMessage(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    return `[${entry.timestamp}] ${levelName}: ${entry.message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || undefined,
      error: error || undefined,
    };
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedMessage = this.formatMessage(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry.context || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.context || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.context || '', entry.error || '');
        if (config.app.environment === 'production' && entry.error) {
          this.reportError(entry.error, entry.context);
        }
        break;
    }
  }

  private reportError(error: Error, context?: Record<string, unknown>): void {
    // In production, you might want to send errors to a monitoring service
    // like Sentry, LogRocket, etc.
    if (config.app.environment === 'production') {
      // Example: Sentry.captureException(error, { extra: context });
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.log(entry);
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.log(entry);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.log(entry);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.log(entry);
  }

  apiRequest(method: string, url: string, data?: unknown): void {
    this.debug(`API Request: ${method} ${url}`, { data });
  }

  apiResponse(method: string, url: string, status: number, duration?: number): void {
    this.debug(`API Response: ${method} ${url} - ${status}`, { duration });
  }

  apiError(method: string, url: string, error: Error): void {
    this.error(`API Error: ${method} ${url}`, error);
  }

  userAction(action: string, context?: Record<string, unknown>): void {
    this.info(`User Action: ${action}`, context);
  }

  performanceMetric(metric: { name: string; value: number; rating?: string }): void {
    this.info(`Performance: ${metric.name}`, { 
      value: metric.value, 
      rating: metric.rating || 'unknown',
      unit: 'ms'
    });
  }
}

export const logger = new Logger();