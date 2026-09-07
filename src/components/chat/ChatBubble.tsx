'use client';

import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export function ChatBubble() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (!user || pathname === '/chat') return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans">
      {isOpen ? (
        <div className="w-[360px] sm:w-[420px] h-[540px] border border-[#262626] bg-[#0A0A0A] animate-in slide-in-from-bottom-2 duration-150">
          <ChatPanel onClose={() => setIsOpen(false)} isFloating={true} />
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-11 h-11 bg-[#FF3D00] text-[#0A0A0A] hover:bg-[#FF5722] border border-[#FF3D00] transition-colors"
          title="Open Community Chat"
        >
          <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10B981] border border-[#0A0A0A] rounded-full" />
        </button>
      )}
    </div>
  );
}
