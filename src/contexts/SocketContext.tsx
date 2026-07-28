'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinRoom: () => {},
  leaveRoom: () => {},
});

export const useSocketContext = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to Socket.io server
    // Since Next.js is running on same port, we can connect to the origin
    const socketInstance = io({
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[SocketContext] Connected to websocket server');
      setIsConnected(true);
      
      // Auto-join personal room if logged in
      if (user?.id) {
        socketInstance.emit('join-room', `user:${user.id}`);
        socketInstance.emit('user:online', user.id);
      }
    });

    socketInstance.on('connect_error', (err) => {
      // Suppress 404 noise when dev server is starting up or disconnected
      setIsConnected(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('[SocketContext] Disconnected from websocket server');
      setIsConnected(false);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user?.id]);

  const joinRoom = (roomName: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-room', roomName);
    }
  };

  const leaveRoom = (roomName: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave-room', roomName);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  );
};
