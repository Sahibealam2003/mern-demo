import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connect = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URL ||
      process.env.MONGO_URI ||
      'mongodb://localhost:27017/todo-app';

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connect;
