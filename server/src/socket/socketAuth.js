import { verifyAccessToken } from '../services/tokenService.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Socket.IO authentication middleware
 * Verifies the JWT token passed in socket handshake auth
 */
export const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user) {
      return next(new Error('User not found'));
    }

    if (user.isBlocked) {
      return next(new Error('Account is blocked'));
    }

    // Attach user to socket
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    next();
  } catch (error) {
    logger.error('Socket auth error:', error.message);
    next(new Error('Invalid or expired token'));
  }
};

export default socketAuth;
