'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  UserPlus,
  Send,
  Image as ImageIcon,
  FileText,
  Network,
  Check,
  X,
  Search,
  Plus,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';

type Tab = 'conversations' | 'friends';

interface ChatPanelProps {
  onClose?: () => void;
  isSidebar?: boolean;
}

export function ChatPanel({ onClose, isSidebar = false }: ChatPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('conversations');

  // Conversations & Friends state
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputContent, setInputContent] = useState('');

  // Friends state
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // New Group Modal State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Conversations & Friends
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('[ChatPanel Conversations Fetch Error]:', err);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
      }
    } catch (err) {
      console.error('[ChatPanel Friends Fetch Error]:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
      loadFriends();
    }
  }, [user]);

  // Load active conversation messages
  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('[ChatPanel Messages Fetch Error]:', err);
    }
  };

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time socket events
  useSocket('message:new', (msg: any) => {
    if (activeConv && msg.conversationId === activeConv.id) {
      setMessages((prev) => [...prev, msg]);
    }
    loadConversations();
  });

  useSocket('friend:request', () => loadFriends());
  useSocket('friend:accepted', () => {
    loadFriends();
    loadConversations();
  });

  useEffect(() => {
    if (activeTab === 'friends' && searchResults.length === 0 && !searchQuery) {
      handleSearchUsers('*');
    }
  }, [activeTab]);

  // Search users
  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q === '*' ? '' : q);
    const query = q.trim() || '*';
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('[Friend Search Error]:', err);
    }
  };

  // Send Friend Request
  const handleSendFriendRequest = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        loadFriends();
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('[Send Friend Request Error]:', err);
    }
  };

  // Accept / Reject Friend Request
  const handleRespondFriendRequest = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });
      if (res.ok) {
        loadFriends();
        loadConversations();
      }
    } catch (err) {
      console.error('[Respond Friend Request Error]:', err);
    }
  };

  // Create Group
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedFriendIds.length === 0) return;
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          isGroup: true,
          memberIds: selectedFriendIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsCreatingGroup(false);
        setGroupName('');
        setSelectedFriendIds([]);
        loadConversations();
        setActiveConv(data.conversation);
      }
    } catch (err) {
      console.error('[Create Group Error]:', err);
    }
  };

  // Send Message
  const handleSendMessage = async (type: 'TEXT' | 'IMAGE' | 'NOTE_CARD' | 'CANVAS_CARD' = 'TEXT', customContent?: string) => {
    const textToSend = customContent || inputContent;
    if (!textToSend.trim() || !activeConv) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConv.id,
          content: textToSend,
          type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        if (!customContent) setInputContent('');
      }
    } catch (err) {
      console.error('[Send Message Error]:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-[#FAFAFA] border border-[#262626] shadow-2xl overflow-hidden font-sans">
      {/* Header Tab Bar */}
      <div className="h-12 bg-[#0F0F0F] border-b border-[#262626] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('conversations');
              setActiveConv(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
              activeTab === 'conversations'
                ? 'bg-[#1A1A1A] text-[#FF3D00] font-bold border-b-2 border-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors relative ${
              activeTab === 'friends'
                ? 'bg-[#1A1A1A] text-[#FF3D00] font-bold border-b-2 border-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends</span>
            {incomingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#FF3D00] animate-pulse" />
            )}
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* CONVERSATIONS TAB */}
        {activeTab === 'conversations' && (
          <>
            {!activeConv ? (
              <div className="flex-1 flex flex-col p-3 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">
                    Conversations ({conversations.length})
                  </span>
                  <button
                    onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#FF3D00] hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Group</span>
                  </button>
                </div>

                {isCreatingGroup && (
                  <div className="p-3 bg-[#0F0F0F] border border-[#262626] mb-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Group Name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#262626] text-xs p-2 text-[#FAFAFA] outline-none"
                    />
                    <div className="font-mono text-[9px] text-[#737373] uppercase">Select Friends:</div>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {friends.map((f) => (
                        <label key={f.id} className="flex items-center gap-2 text-xs text-[#FAFAFA] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFriendIds.includes(f.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedFriendIds([...selectedFriendIds, f.id]);
                              else setSelectedFriendIds(selectedFriendIds.filter((id) => id !== f.id));
                            }}
                            className="accent-[#FF3D00]"
                          />
                          <span>{f.username || f.email}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleCreateGroup}
                      className="w-full py-1.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider"
                    >
                      Create Group
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 flex-1">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 font-mono text-xs text-[#737373]">
                      No active conversations. Add friends to start messaging!
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setActiveConv(c)}
                        className="p-2.5 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#FAFAFA] truncate">
                            {c.name || c.members.map((m: any) => m.username).join(', ')}
                          </span>
                          {c.isGroup && (
                            <span className="font-mono text-[9px] uppercase px-1 border border-[#FF3D00] text-[#FF3D00]">
                              GROUP
                            </span>
                          )}
                        </div>
                        {c.lastMessage && (
                          <div className="font-mono text-[11px] text-[#737373] truncate">
                            {c.lastMessage.senderName}: {c.lastMessage.content}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* ACTIVE CONVERSATION MESSAGES FEED */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Conv Header */}
                <div className="p-2.5 bg-[#0F0F0F] border-b border-[#262626] flex items-center justify-between">
                  <button
                    onClick={() => setActiveConv(null)}
                    className="font-mono text-xs text-[#FF3D00] hover:underline"
                  >
                    ← Back
                  </button>
                  <span className="font-bold text-xs text-[#FAFAFA]">
                    {activeConv.name || activeConv.members.map((m: any) => m.username).join(', ')}
                  </span>
                  <div className="w-8" />
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {messages.map((m) => {
                    const isMe = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="font-mono text-[9px] text-[#737373] uppercase mb-0.5">
                          {m.senderName || 'User'}
                        </span>
                        <div
                          className={`p-2.5 max-w-[85%] text-xs border ${
                            isMe
                              ? 'bg-[#FF3D00]/10 border-[#FF3D00] text-[#FAFAFA]'
                              : 'bg-[#0F0F0F] border-[#262626] text-[#FAFAFA]'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-2.5 bg-[#0F0F0F] border-t border-[#262626] flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2 outline-none"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    className="p-2 bg-[#FF3D00] text-[#0A0A0A] font-bold hover:bg-[#FF5722] transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* FRIENDS & REQUESTS TAB */}
        {activeTab === 'friends' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-4">
            {/* Search Input */}
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                Find Friends
              </label>
              <div className="flex items-center bg-[#1A1A1A] border border-[#262626] focus-within:border-[#FF3D00] px-2 py-1.5">
                <Search className="w-3.5 h-3.5 text-[#737373] mr-2" />
                <input
                  type="text"
                  placeholder="Username or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#FAFAFA] outline-none"
                />
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase text-[#737373]">Search Results</span>
                {searchResults.map((u) => {
                  const isFriend = friends.some((f) => f.id === u.id);
                  const isSent = outgoingRequests.some((r) => r.receiverId === u.id);
                  const displayName = u.name || u.username || u.email.split('@')[0];

                  return (
                    <div key={u.id} className="flex items-center justify-between p-2.5 bg-[#0F0F0F] border border-[#262626]">
                      <div className="flex items-center gap-2.5 truncate max-w-[170px]">
                        <div className="w-6 h-6 bg-[#FF3D00] text-[#0A0A0A] font-bold font-mono text-[10px] flex items-center justify-center shrink-0">
                          {displayName[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs text-[#FAFAFA] font-bold truncate">{displayName}</div>
                          <div className="text-[10px] text-[#737373] font-mono truncate">{u.email}</div>
                        </div>
                      </div>

                      {isFriend ? (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#10B981] text-[#10B981] bg-[#10B981]/10 font-bold">
                          Friend ✓
                        </span>
                      ) : isSent ? (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#262626] text-[#737373]">
                          Request Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(u.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#FF3D00] hover:bg-[#FF5722] text-[#0A0A0A] font-mono text-[10px] uppercase font-bold transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF3D00] block mb-1">
                  Incoming Requests ({incomingRequests.length})
                </span>
                <div className="space-y-1.5">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-2.5 bg-[#0F0F0F] border border-[#FF3D00]/40">
                      <span className="text-xs text-[#FAFAFA] font-bold">{req.senderName}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRespondFriendRequest(req.id, 'ACCEPTED')}
                          className="p-1 bg-[#10B981] text-[#0A0A0A] hover:bg-[#10B981]/80 transition-colors"
                          title="Accept Request"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => handleRespondFriendRequest(req.id, 'REJECTED')}
                          className="p-1 bg-[#FF3D00] text-[#0A0A0A] hover:bg-[#FF5722] transition-colors"
                          title="Reject Request"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Friends */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373] block mb-1">
                Your Friends ({friends.length})
              </span>
              <div className="space-y-1.5">
                {friends.length === 0 ? (
                  <div className="text-center py-4 font-mono text-xs text-[#737373]">
                    No friends added yet. Search users above to connect!
                  </div>
                ) : (
                  friends.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2.5 bg-[#0F0F0F] border border-[#262626]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 bg-[#1A1A1A] border border-[#262626] font-mono text-[10px] text-[#FAFAFA] font-bold flex items-center justify-center shrink-0">
                          {(f.name || f.username || f.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs text-[#FAFAFA] font-bold">{f.name || f.username || f.email}</div>
                          <div className="text-[9px] text-[#737373] font-mono">{f.email}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
