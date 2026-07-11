import { Server } from 'socket.io';
import { socketAuth } from './socketAuth.js';
import { registerTodoHandlers } from './handlers/todoHandler.js';
import { registerWorkspaceHandlers } from './handlers/workspaceHandler.js';
import { registerCommentHandlers } from './handlers/commentHandler.js';
import { registerNotificationHandlers } from './handlers/notificationHandler.js';
import logger from '../utils/logger.js';

// Module-level io instance so controllers can import it
let ioInstance = null;

/**
 * Initialize Socket.IO on the HTTP server
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply JWT auth middleware to every socket connection
  io.use(socketAuth);

  // Track online users: userId → Set of socketIds
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // ── Personal room ───────────────────────────────────────────────
    // Each user joins their own room so targeted notifications work:
    // io.to(`user:${userId}`).emit(...)
    socket.join(`user:${userId}`);

    // ── Track presence ──────────────────────────────────────────────
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // ── Register domain handlers ────────────────────────────────────
    registerWorkspaceHandlers(socket, io);
    registerTodoHandlers(socket, io);
    registerCommentHandlers(socket, io);
    registerNotificationHandlers(socket, io);

    // ── Online users query ──────────────────────────────────────────
    socket.on('users:online', () => {
      const ids = [...onlineUsers.keys()];
      socket.emit('users:online', { userIds: ids });
    });

    // ── Disconnect ──────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (user: ${userId}) — ${reason}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast user went offline to all workspace rooms they were in
          socket.broadcast.emit('users:offline', { userId });
        }
      }
    });

    // ── Error ───────────────────────────────────────────────────────
    socket.on('error', (err) => {
      logger.error(`Socket error (${socket.id}):`, err);
    });
  });

  ioInstance = io;
  logger.info('Socket.IO initialized');
  return io;
};

/**
 * Get the initialized io instance (for use in controllers/workers)
 * @returns {import('socket.io').Server}
 */
export const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized. Call initializeSocket first.');
  }
  return ioInstance;
};

export default { initializeSocket, getIO };
