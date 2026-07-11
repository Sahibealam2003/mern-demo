import logger from '../../utils/logger.js';

/**
 * Register todo-related socket event handlers
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export const registerTodoHandlers = (socket, io) => {
  /**
   * Join a todo room to receive live comment + status updates
   * Payload: { todoId }
   */
  socket.on('todo:join', ({ todoId }) => {
    if (!todoId) return;
    socket.join(`todo:${todoId}`);
    logger.debug(`Socket ${socket.id} joined todo:${todoId}`);
  });

  /**
   * Leave a todo room
   * Payload: { todoId }
   */
  socket.on('todo:leave', ({ todoId }) => {
    if (!todoId) return;
    socket.leave(`todo:${todoId}`);
  });

  /**
   * Broadcast typing indicator inside a todo (for comments)
   * Payload: { todoId, isTyping }
   */
  socket.on('todo:typing', ({ todoId, isTyping }) => {
    if (!todoId) return;
    socket.to(`todo:${todoId}`).emit('todo:typing', {
      userId: socket.user.id,
      userName: socket.user.name,
      avatar: socket.user.avatar,
      isTyping,
    });
  });

  /**
   * Client acknowledges a todo update (optimistic UI sync)
   * Payload: { todoId, version }
   */
  socket.on('todo:ack', ({ todoId, version }) => {
    logger.debug(`Todo ack from ${socket.user.id}: todo:${todoId} v${version}`);
  });
};

export default registerTodoHandlers;
