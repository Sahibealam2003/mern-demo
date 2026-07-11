import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { selectAccessToken, selectIsAuthenticated } from '../store/slices/authSlice.js';
import { addNotification, setUnreadCount } from '../store/slices/notificationSlice.js';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const accessToken = useSelector(selectAccessToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Disconnect if we were connected
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ── Connection events ────────────────────────────────────────────
    socket.on('connect', () => {
      setIsConnected(true);
      // Join all workspace rooms automatically
      socket.emit('workspace:joinAll');
      // Get initial unread count
      socket.emit('notification:getUnreadCount');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server forced disconnect — don't auto-reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    // ── Notifications ────────────────────────────────────────────────
    socket.on('notification:new', (notification) => {
      dispatch(addNotification(notification));
      toast(notification.message || notification.title, {
        icon: '🔔',
        duration: 4000,
      });
    });

    socket.on('notification:unreadCount', ({ count }) => {
      dispatch(setUnreadCount(count));
    });

    // ── Todos ────────────────────────────────────────────────────────
    socket.on('todo:created', () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
    });

    socket.on('todo:updated', () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
    });

    socket.on('todo:deleted', () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
    });

    socket.on('todo:restored', () => {
      qc.invalidateQueries({ queryKey: ['todos'] });
    });

    // ── Comments ─────────────────────────────────────────────────────
    socket.on('comment:created', () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
    });

    socket.on('comment:updated', () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
    });

    socket.on('comment:deleted', () => {
      qc.invalidateQueries({ queryKey: ['comments'] });
    });

    // ── Presence ─────────────────────────────────────────────────────
    socket.on('users:online', ({ userIds }) => {
      setOnlineUsers(userIds);
    });

    socket.on('users:offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    socket.on('workspace:userOnline', ({ userId }) => {
      setOnlineUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('notification:new');
      socket.off('notification:unreadCount');
      socket.off('todo:created');
      socket.off('todo:updated');
      socket.off('todo:deleted');
      socket.off('todo:restored');
      socket.off('comment:created');
      socket.off('comment:updated');
      socket.off('comment:deleted');
      socket.off('users:online');
      socket.off('users:offline');
      socket.off('workspace:userOnline');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken, dispatch, qc]);

  const value = {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    joinWorkspace: (workspaceId) => socketRef.current?.emit('workspace:join', { workspaceId }),
    leaveWorkspace: (workspaceId) => socketRef.current?.emit('workspace:leave', { workspaceId }),
    joinTodo: (todoId) => socketRef.current?.emit('todo:join', { todoId }),
    leaveTodo: (todoId) => socketRef.current?.emit('todo:leave', { todoId }),
    emitTyping: (todoId, isTyping) => socketRef.current?.emit('todo:typing', { todoId, isTyping }),
    emitCommentTyping: (todoId, isTyping) => socketRef.current?.emit('comment:typing', { todoId, isTyping }),
    broadcastPresence: (workspaceId) => socketRef.current?.emit('workspace:presence', { workspaceId }),
    isOnline: (userId) => onlineUsers.includes(userId),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};

export default SocketContext;
