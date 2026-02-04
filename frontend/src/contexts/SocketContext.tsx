/* eslint-disable react-refresh/only-export-components */
import { disconnectSocket, initializeSocket } from '@/services/socketService';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('resqwave_token')
  );
  const isInitializing = useRef(false);

  // Monitor localStorage for token changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'resqwave_token') {
        setToken(e.newValue);
      }
    };

    // Custom event for same-tab token updates (since StorageEvent only fires cross-tab)
    const handleTokenUpdate = () => {
      const newToken = localStorage.getItem('resqwave_token');
      setToken(newToken);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('resqwave_token_updated', handleTokenUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('resqwave_token_updated', handleTokenUpdate);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      console.log('[SocketContext] No token found, skipping connection');
      // Disconnect if token is removed
      if (socket) {
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
      }
      isInitializing.current = false;
      return;
    }

    // Prevent duplicate initialization
    if (isInitializing.current) {
      console.log('[SocketContext] Already initializing, skipping');
      return;
    }

    // Check if socket already exists and is connected
    if (socket?.connected) {
      console.log('[SocketContext] Socket already connected, skipping initialization');
      return;
    }

    console.log('[SocketContext] Initializing socket connection with token');
    isInitializing.current = true;
    
    // Handle authentication errors (expired token)
    const handleAuthError = () => {
      console.error('[SocketContext] Auth error - clearing expired token');
      
      // Clear the expired token from localStorage
      localStorage.removeItem('resqwave_token');
      localStorage.removeItem('resqwave_user');
      
      // Trigger token update to disconnect socket
      setToken(null);
      
      // Dispatch event to notify other components (e.g., AuthContext)
      window.dispatchEvent(new Event('resqwave_token_expired'));
      
      isInitializing.current = false;
    };
    
    const socketInstance = initializeSocket(token, handleAuthError);
    setSocket(socketInstance);

    // Listen for connection status changes
    const handleConnect = () => {
      console.log('[SocketContext] Socket connected');
      setIsConnected(true);
      isInitializing.current = false;
    };

    const handleDisconnect = () => {
      console.log('[SocketContext] Socket disconnected');
      setIsConnected(false);
      isInitializing.current = false;
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Cleanup when token changes
    return () => {
      console.log('[SocketContext] Cleaning up socket listeners');
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      isInitializing.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
