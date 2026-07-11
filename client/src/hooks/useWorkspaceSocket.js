import { useEffect } from 'react';
import { useSocket } from './useSocket.js';

/**
 * Join a workspace room on mount and leave on unmount.
 * Also broadcasts user presence.
 * @param {string} workspaceId
 */
export function useWorkspaceSocket(workspaceId) {
  const { joinWorkspace, leaveWorkspace, broadcastPresence, isConnected } = useSocket();

  useEffect(() => {
    if (!workspaceId || !isConnected) return;

    joinWorkspace(workspaceId);
    broadcastPresence(workspaceId);

    return () => {
      leaveWorkspace(workspaceId);
    };
  }, [workspaceId, isConnected, joinWorkspace, leaveWorkspace, broadcastPresence]);
}

export default useWorkspaceSocket;
