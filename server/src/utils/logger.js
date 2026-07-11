const winston = require("winston");
const path = require("path");

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present (excluding sensitive data)
    if (Object.keys(metadata).length > 0) {
      // Filter out sensitive information
      const safeMetadata = { ...metadata };
      delete safeMetadata.password;
      delete safeMetadata.token;
      delete safeMetadata.refreshToken;
      delete safeMetadata.accessToken;
      delete safeMetadata.passwordHash;
      
      if (Object.keys(safeMetadata).length > 0) {
        log += ` | ${JSON.stringify(safeMetadata)}`;
      }
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "mern-stack-api" },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    
    // File transport for errors (non-production)
    ...(process.env.NODE_ENV !== "production"
      ? [
          new winston.transports.File({
            filename: path.join(__dirname, "../../logs/error.log"),
            level: "error",
          }),
          new winston.transports.File({
            filename: path.join(__dirname, "../../logs/combined.log"),
          }),
        ]
      : []),
  ],
});

// Create stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;