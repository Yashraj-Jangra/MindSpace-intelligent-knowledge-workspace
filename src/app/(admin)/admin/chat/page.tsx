'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { MessageSquare, Trash2 } from 'lucide-react';

export default function AdminChatPage() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[Admin Chat Fetch Error]:', err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (confirm('Delete message from chat feed?')) {
      try {
        const res = await fetch(`/api/admin/chat?id=${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      } catch (err) {
        console.error('[Delete Message Error]:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 text-[#F59E0B] font-mono text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>Community Moderation</span>
            </div>
            <h1 className="font-sans font-black text-2xl tracking-tight uppercase mt-1">
              Chat Feed Moderation
            </h1>
          </div>
        </div>

        {/* Messages Moderation Table */}
        <div className="border border-[#262626] bg-[#0F0F0F] overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-[#141414] border-b border-[#262626] font-mono text-[10px] uppercase tracking-wider text-[#737373]">
              <tr>
                <th className="p-3">Sender</th>
                <th className="p-3">Conversation</th>
                <th className="p-3">Message Snippet</th>
                <th className="p-3">Sent At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#737373] font-mono text-xs">
                    No chat messages found for moderation.
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-[#1A1A1A] transition-colors">
                    <td className="p-3 font-semibold text-[#FAFAFA]">
                      {m.senderName}
                    </td>
                    <td className="p-3 font-mono text-xs text-[#737373]">
                      {m.conversationName}
                    </td>
                    <td className="p-3 text-[#FAFAFA] max-w-xs truncate">
                      {m.content}
                    </td>
                    <td className="p-3 font-mono text-[#737373]">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteMessage(m.id)}
                        className="p-1 text-[#737373] hover:text-[#FF3D00] transition-colors"
                        title="Delete Message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
