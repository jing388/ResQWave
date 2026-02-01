import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Initialize Socket.IO connection
 */
export const initializeSocket = (token: string, onAuthError?: () => void): Socket => {
  // If socket exists and is connected, return it
  if (socket?.connected) {
    console.log('[Socket] Already connected');
    return socket;
  }

  // If socket exists but disconnected, clean it up first
  if (socket) {
    console.log('[Socket] Cleaning up existing disconnected socket');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  console.log('[Socket] Creating new socket connection');
  socket = io(import.meta.env.VITE_BACKEND_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    
    // Check if error is related to authentication/JWT
    if (error.message.includes('jwt') || error.message.includes('auth') || error.message.includes('token')) {
      console.error('[Socket] Authentication error detected - stopping reconnection');
      
      // Disable further reconnection attempts
      if (socket) {
        socket.io.opts.reconnection = false;
      }
      
      // Call the auth error callback to handle logout
      if (onAuthError) {
        onAuthError();
      }
    }
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[Socket] Reconnection attempt:', attemptNumber);
  });

  return socket;
};

/**
 * Get the current socket instance
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Disconnecting...');
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};
