'use client';

import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { useAuth } from '@/contexts/AuthContext';

export function ChatBubble() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {isOpen ? (
        <div className="w-[360px] sm:w-[400px] h-[520px] shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <ChatPanel onClose={() => setIsOpen(false)} />
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-12 h-12 bg-[#FF3D00] text-[#0A0A0A] hover:bg-[#FF5722] shadow-xl transition-all duration-150 active:scale-95"
          title="Open Community Chat"
        >
          <MessageSquare className="w-6 h-6 stroke-[2]" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#10B981] border-2 border-[#0A0A0A] rounded-full" />
        </button>
      )}
    </div>
  );
}
