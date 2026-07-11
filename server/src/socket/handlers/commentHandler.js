import logger from '../../utils/logger.js';

/**
 * Register comment-related socket event handlers
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export const registerCommentHandlers = (socket, io) => {
  /**
   * Broadcast typing indicator in comment thread
   * Payload: { todoId, isTyping }
   */
  socket.on('comment:typing', ({ todoId, isTyping }) => {
    if (!todoId) return;
    socket.to(`todo:${todoId}`).emit('comment:typing', {
      userId: socket.user.id,
      userName: socket.user.name,
      avatar: socket.user.avatar,
      isTyping,
    });
  });
};

export default registerCommentHandlers;
