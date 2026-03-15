/**
 * Logger utility using Winston
 * Provides structured logging with different levels for dev/prod
 */
import winston from 'winston';

const { combine, timestamp, colorize, printf, json } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${ts} [${level}]: ${message}${metaStr}`;
});

// Determine log level from env or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Create the Winston logger instance
const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? combine(timestamp(), json())
          : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),
  ],
});

// Export convenience methods so callers don't import winston directly
export default logger;
export const { info, warn, error, debug } = logger;
