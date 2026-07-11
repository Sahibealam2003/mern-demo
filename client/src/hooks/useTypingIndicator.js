import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket.js';

/**
 * Track typing state and broadcast it via Socket.IO.
 * @param {string} todoId - The todo being typed in
 * @param {number} debounceMs - How long after last keystroke to emit stop typing
 */
export function useTypingIndicator(todoId, debounceMs = 1500) {
  const { emitCommentTyping } = useSocket();
  const [typingUsers, setTypingUsers] = useState([]);
  const { socket } = useSocket();
  const stopTimer = useRef(null);
  const isTypingRef = useRef(false);

  // Listen for remote typing events
  useEffect(() => {
    if (!socket || !todoId) return;

    const onTyping = ({ userId, userName, avatar, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.find((u) => u.userId === userId)) return prev;
          return [...prev, { userId, userName, avatar }];
        }
        return prev.filter((u) => u.userId !== userId);
      });
    };

    socket.on('comment:typing', onTyping);
    return () => socket.off('comment:typing', onTyping);
  }, [socket, todoId]);

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitCommentTyping(todoId, true);
    }
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      emitCommentTyping(todoId, false);
    }, debounceMs);
  }, [todoId, debounceMs, emitCommentTyping]);

  const stopTyping = useCallback(() => {
    clearTimeout(stopTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitCommentTyping(todoId, false);
    }
  }, [todoId, emitCommentTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(stopTimer.current);
      if (isTypingRef.current) {
        emitCommentTyping(todoId, false);
      }
    };
  }, [todoId, emitCommentTyping]);

  return { typingUsers, startTyping, stopTyping };
}

export default useTypingIndicator;
