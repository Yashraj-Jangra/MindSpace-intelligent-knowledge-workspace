'use client';

import { useEffect } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';

export function useSocket(event: string, callback: (...args: any[]) => void) {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
}
