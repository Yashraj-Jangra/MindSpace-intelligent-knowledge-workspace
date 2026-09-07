'use client';

import React, { useEffect, useState } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { MousePointer2 } from 'lucide-react';

interface UserCursor {
  socketId: string;
  user: {
    id: string;
    username: string;
    email?: string;
  };
  x: number;
  y: number;
  color: string;
}

const CURSOR_COLORS = [
  '#FF3D00',
  '#4285F4',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
];

function getRandomColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

export function MultiplayerCursors({ canvasId }: { canvasId: string }) {
  const { socket } = useSocketContext();
  const [cursors, setCursors] = useState<{ [socketId: string]: UserCursor }>({});

  useEffect(() => {
    if (!socket || !canvasId) return;

    const handleCursorMove = (data: any) => {
      if (data.socketId === socket.id) return; // ignore own pointer

      setCursors((prev) => ({
        ...prev,
        [data.socketId]: {
          socketId: data.socketId,
          user: data.user || { id: data.socketId, username: 'Collaborator' },
          x: data.x,
          y: data.y,
          color: getRandomColor(data.user?.id || data.socketId),
        },
      }));
    };

    const handleCursorLeft = (data: { socketId: string }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    };

    socket.on('cursor:move', handleCursorMove);
    socket.on('cursor:left', handleCursorLeft);

    return () => {
      socket.off('cursor:move', handleCursorMove);
      socket.off('cursor:left', handleCursorLeft);
    };
  }, [socket, canvasId]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {Object.values(cursors).map((c) => (
        <div
          key={c.socketId}
          className="absolute transition-all duration-75 ease-out flex items-center gap-1 select-none"
          style={{
            transform: `translate3d(${c.x}px, ${c.y}px, 0)`,
          }}
        >
          <MousePointer2
            className="w-4 h-4 -rotate-45"
            style={{ color: c.color, fill: c.color }}
          />
          <span
            className="font-mono text-[10px] font-bold text-white px-1.5 py-0.5"
            style={{ backgroundColor: c.color }}
          >
            {c.user.username || c.user.email || 'Collaborator'}
          </span>
        </div>
      ))}
    </div>
  );
}
