'use client';

import React from 'react';
import { ChatPanel } from './ChatPanel';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#0A0A0A] border-l border-[#262626] h-full shadow-2xl animate-in slide-in-from-right duration-200">
        <ChatPanel onClose={onClose} isSidebar />
      </div>
    </div>
  );
}
