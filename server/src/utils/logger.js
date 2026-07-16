import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
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

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: {
    service: "mern-stack-api",
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),

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

logger.stream = {
  write(message) {
    logger.http(message.trim());
  },
};

export default logger;