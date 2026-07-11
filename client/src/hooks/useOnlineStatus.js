import { useSocket } from './useSocket.js';

/**
 * Check if a specific user is currently online.
 * @param {string} userId
 * @returns {boolean}
 */
export function useOnlineStatus(userId) {
  const { isOnline } = useSocket();
  return userId ? isOnline(userId) : false;
}

/**
 * Get the full list of online user IDs.
 * @returns {string[]}
 */
export function useOnlineUsers() {
  const { onlineUsers } = useSocket();
  return onlineUsers;
}

export default useOnlineStatus;
