'use client';

import React from 'react';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useAuth } from '@/contexts/AuthContext';

export default function DedicatedChatPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center font-mono text-xs">
        Loading creator credentials...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col items-center justify-center space-y-4">
        <p className="font-mono text-xs text-[#737373] uppercase">Access Restricted</p>
        <h1 className="font-sans font-black text-xl uppercase tracking-tighter">Please log in to chat</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col overflow-hidden font-sans">
      <AppHeader title="Community Chat" />
      
      <main className="flex-1 h-[calc(100vh-56px)] overflow-hidden">
        <ChatPanel />
      </main>
    </div>
  );
}
