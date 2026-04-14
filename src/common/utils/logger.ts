import * as winston from 'winston';

const logFormat = winston.format.printf(
  ({
    timestamp,
    level,
    message,
    ...meta
  }: {
    timestamp: string;
    level: string;
    message: string;
    [key: string]: any;
  }) => {
    const extra = meta && Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${process.env.NODE_ENV || 'development'} ${level}: ${message} ${extra}`;
  },
);

export const log = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  transports: [
    // File transport (no color)
    new winston.transports.File({
      filename: 'logs/app.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        // winston.format.json(), // Use JSON format for structured logging
        logFormat,
      ),
    }),
    // Console transport (with color)
    // new winston.transports.Console({
    //   format: winston.format.combine(
    //     winston.format.colorize({ all: true }),
    //     logFormat,
    //   ),
    // }),
  ],
});
// Example usage:
// log.info('GET /login requested', 'info');
// log.error('This is an error message', 'error');
// log.warn('This is a warning message', 'warn');
// log.debug('This is a debug message', 'debug');
// log.verbose('This is a verbose message', 'verbose');
// log.http('This is an http message', 'http');
