import Workspace from '../../models/Workspace.js';
import logger from '../../utils/logger.js';

/**
 * Register workspace-related socket event handlers
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export const registerWorkspaceHandlers = (socket, io) => {
  /**
   * Join all workspace rooms the user belongs to
   * Called once on connection
   */
  socket.on('workspace:joinAll', async () => {
    try {
      const workspaces = await Workspace.find({
        'members.user': socket.user.id,
      }).select('_id').lean();

      for (const ws of workspaces) {
        socket.join(`workspace:${ws._id}`);
      }

      logger.debug(`Socket ${socket.id} joined ${workspaces.length} workspace room(s)`);
    } catch (error) {
      logger.error('workspace:joinAll error:', error);
    }
  });

  /**
   * Join a specific workspace room
   * Payload: { workspaceId }
   */
  socket.on('workspace:join', async ({ workspaceId }) => {
    if (!workspaceId) return;

    try {
      // Verify user is a member before allowing join
      const workspace = await Workspace.findOne({
        _id: workspaceId,
        'members.user': socket.user.id,
      }).select('_id').lean();

      if (!workspace) {
        socket.emit('error', { message: 'Access denied to workspace' });
        return;
      }

      socket.join(`workspace:${workspaceId}`);
      logger.debug(`Socket ${socket.id} joined workspace:${workspaceId}`);
    } catch (error) {
      logger.error('workspace:join error:', error);
    }
  });

  /**
   * Leave a workspace room
   * Payload: { workspaceId }
   */
  socket.on('workspace:leave', ({ workspaceId }) => {
    if (!workspaceId) return;
    socket.leave(`workspace:${workspaceId}`);
  });

  /**
   * Broadcast user presence in workspace
   * Payload: { workspaceId }
   */
  socket.on('workspace:presence', ({ workspaceId }) => {
    if (!workspaceId) return;
    socket.to(`workspace:${workspaceId}`).emit('workspace:userOnline', {
      userId: socket.user.id,
      name: socket.user.name,
      avatar: socket.user.avatar,
    });
  });
};

export default registerWorkspaceHandlers;
