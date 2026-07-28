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
  CheckCheck,
  X,
  Search,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Info,
  Calendar,
  AlertCircle,
  Hash,
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
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Friend list state
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  
  // Active chat state
  const [inputContent, setInputContent] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  
  // Redesign Features
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Conversation list filter query
  const [convFilter, setConvFilter] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial profile & data
  useEffect(() => {
    if (user) {
      loadConversations();
      loadFriends();
      loadOnlineUsers();
    }
  }, [user]);

  // Handle auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load online users from Redis cache
  const loadOnlineUsers = async () => {
    try {
      const res = await fetch('/api/chat/status');
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(new Set(data.onlineUsers || []));
      }
    } catch (err) {
      console.error('Failed to load online users:', err);
    }
  };

  // Real-time socket events
  useSocket('user:online', ({ userId }) => {
    setOnlineUsers((prev) => {
      const copy = new Set(prev);
      copy.add(userId);
      return copy;
    });
  });

  useSocket('user:offline', ({ userId }) => {
    setOnlineUsers((prev) => {
      const copy = new Set(prev);
      copy.delete(userId);
      return copy;
    });
  });

  useSocket('message:new', (msg: any) => {
    if (activeConv && msg.conversationId === activeConv.id) {
      setMessages((prev) => [...prev, msg]);
      // Mark read receipt instantly if focused
      markAsRead(activeConv.id);
    }
    loadConversations();
  });

  useSocket('message:read', ({ conversationId, userId }) => {
    if (activeConv && conversationId === activeConv.id) {
      setMessages((prev) =>
        prev.map((m) => {
          if (!m.readBy.includes(userId)) {
            return { ...m, readBy: [...m.readBy, userId] };
          }
          return m;
        })
      );
    }
  });

  useSocket('message:deleted', ({ messageId, conversationId }) => {
    if (activeConv && conversationId === activeConv.id) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            return { ...m, content: 'This message was deleted', type: 'DELETED' };
          }
          return m;
        })
      );
    }
  });

  useSocket('friend:request', () => loadFriends());
  useSocket('friend:accepted', () => {
    loadFriends();
    loadConversations();
  });

  // Load conversations
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('[Conversations Load Error]:', err);
    }
  };

  // Load friends
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
      console.error('[Friends Load Error]:', err);
    }
  };

  // Load messages & trigger mark read
  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        markAsRead(convId);
      }
    } catch (err) {
      console.error('[Messages Load Error]:', err);
    }
  };

  const markAsRead = async (convId: string) => {
    try {
      await fetch('/api/chat/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
      });
    } catch (err) {
      console.error('Failed to mark read receipt:', err);
    }
  };

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      setShowDetails(false);
      setChatSearchQuery('');
    }
  }, [activeConv]);

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

  // Autoload suggestions when friends tab loads
  useEffect(() => {
    if (activeTab === 'friends' && searchResults.length === 0 && !searchQuery) {
      handleSearchUsers('*');
    }
  }, [activeTab]);

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

  // Send Message
  const handleSendMessage = async () => {
    if (!inputContent.trim() || !activeConv) return;
    const content = inputContent;
    setInputContent('');
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConv.id,
          content,
          type: 'TEXT',
        }),
      });
    } catch (err) {
      console.error('[Send Message Error]:', err);
    }
  };

  // Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message? Others will see that you deleted it.')) {
      return;
    }
    try {
      await fetch('/api/chat/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
    } catch (err) {
      console.error('[Delete Message Error]:', err);
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

  const getChatPartner = (conv: any) => {
    if (!conv || conv.isGroup) return null;
    return conv.members.find((m: any) => m.userId !== user?.id) || null;
  };

  const isPartnerOnline = (conv: any) => {
    const partner = getChatPartner(conv);
    return partner ? onlineUsers.has(partner.userId) : false;
  };

  // Filter conversations by search input
  const filteredConvs = conversations.filter((c) => {
    if (!convFilter.trim()) return true;
    const name = c.name || c.members.map((m: any) => m.username).join(', ');
    return name.toLowerCase().includes(convFilter.toLowerCase());
  });

  // Filter messages in chat details search
  const filteredMessages = messages.filter((m) => {
    if (!chatSearchQuery.trim()) return false;
    return m.content.toLowerCase().includes(chatSearchQuery.toLowerCase());
  });

  const getInitials = (nameStr: string) => {
    if (!nameStr) return '?';
    return nameStr.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const layoutClass = isFullScreen
    ? 'fixed inset-0 z-[100] w-screen h-screen bg-[#0A0A0A]'
    : 'w-full h-full bg-[#0A0A0A] border border-[#262626]';

  return (
    <div className={`${layoutClass} flex flex-col font-sans overflow-hidden text-[#FAFAFA]`}>
      
      {/* Redesigned Sleek Header */}
      <header className="p-3 bg-[#0F0F0F] border-b border-[#262626] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FF3D00] text-[#0A0A0A] font-black text-sm flex items-center justify-center rounded-lg">
            <MessageSquare className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="font-sans font-black text-xs tracking-wider uppercase text-[#FAFAFA]">
              MIND[COMMUNITY]
            </h2>
            <div className="flex items-center gap-1 font-mono text-[9px] text-[#737373]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>{onlineUsers.size} ONLINE CREATORS</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Full Screen Mode Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-all rounded"
            title={isFullScreen ? 'Minimize Chat' : 'Expand Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-colors rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Dual-Column Panel Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN: CHATS & FRIENDS DIRECTORY (1/3 width) */}
        <div className="w-full sm:w-[320px] shrink-0 border-r border-[#262626] bg-[#0A0A0A] flex flex-col overflow-hidden">
          
          {/* Segments tabs selector */}
          <div className="flex border-b border-[#262626] text-center font-mono text-[10px] uppercase shrink-0 bg-[#0F0F0F]">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 py-3 font-bold border-r border-[#262626] transition-colors ${
                activeTab === 'conversations'
                  ? 'text-[#FF3D00] border-b-2 border-b-[#FF3D00]'
                  : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 font-bold transition-colors ${
                activeTab === 'friends'
                  ? 'text-[#FF3D00] border-b-2 border-b-[#FF3D00]'
                  : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              Add Friends
            </button>
          </div>

          {/* ACTIVE TAB: CONVERSATIONS LIST */}
          {activeTab === 'conversations' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Conversations Search */}
              <div className="p-3 border-b border-[#262626] bg-[#0A0A0A]">
                <div className="flex items-center bg-[#1A1A1A] border border-[#262626] focus-within:border-[#FF3D00] px-2.5 py-1.5 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-[#737373] mr-2" />
                  <input
                    type="text"
                    placeholder="Search chat or username..."
                    value={convFilter}
                    onChange={(e) => setConvFilter(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#FAFAFA] outline-none"
                  />
                </div>
              </div>

              {/* Chat group creation triggers */}
              <div className="px-3 py-2 bg-[#0F0F0F] border-b border-[#262626] flex items-center justify-between shrink-0">
                <span className="font-mono text-[9px] text-[#737373] uppercase">GROUP CONVERSATIONS</span>
                <button
                  onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                  className="flex items-center gap-1 font-mono text-[9px] uppercase font-bold text-[#FF3D00] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Group</span>
                </button>
              </div>

              {isCreatingGroup && (
                <div className="p-3 bg-[#0F0F0F] border-b border-[#262626] space-y-3 shrink-0 font-mono text-xs">
                  <input
                    type="text"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2 outline-none rounded-lg"
                  />
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                    {friends.map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-[10px] text-[#737373] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFriendIds.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFriendIds((prev) => [...prev, f.id]);
                            } else {
                              setSelectedFriendIds((prev) => prev.filter((id) => id !== f.id));
                            }
                          }}
                          className="accent-[#FF3D00]"
                        />
                        <span>{f.name || f.username}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleCreateGroup}
                    className="w-full py-1.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider rounded-lg"
                  >
                    Launch Group
                  </button>
                </div>
              )}

              {/* Conversations Feed */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {filteredConvs.length === 0 ? (
                  <div className="text-center py-12 font-mono text-xs text-[#737373]">
                    No active conversations. Add friends to begin chat messaging!
                  </div>
                ) : (
                  filteredConvs.map((c) => {
                    const isActive = activeConv?.id === c.id;
                    const partner = getChatPartner(c);
                    const isOnline = isPartnerOnline(c);
                    const initials = getInitials(c.name || partner?.name || partner?.username || '?');

                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveConv(c)}
                        className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                          isActive
                            ? 'bg-[#FF3D00]/5 border-[#FF3D00] shadow-sm'
                            : 'bg-[#0F0F0F] border-[#262626] hover:bg-[#1A1A1A]'
                        }`}
                      >
                        {/* PFP block with live online dot */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 bg-[#1A1A1A] border border-[#262626] font-bold text-xs text-[#FAFAFA] flex items-center justify-center rounded-xl font-mono">
                            {initials}
                          </div>
                          {!c.isGroup && (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#0A0A0A] rounded-full ${
                                isOnline ? 'bg-[#10B981]' : 'bg-[#737373]'
                              }`}
                            />
                          )}
                        </div>

                        {/* Title details & last msg snippet */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#FAFAFA] truncate">
                              {c.name || partner?.name || partner?.username || 'Private Chat'}
                            </span>
                            {c.isGroup && (
                              <span className="font-mono text-[8px] px-1 border border-[#FF3D00] text-[#FF3D00] rounded">
                                GROUP
                              </span>
                            )}
                          </div>
                          {c.lastMessage && (
                            <div className="font-mono text-[10px] text-[#737373] truncate mt-1">
                              <span className="text-[#FAFAFA]">{c.lastMessage.senderName}:</span> {c.lastMessage.content}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ACTIVE TAB: FRIENDS DIRECTORY */}
          {activeTab === 'friends' && (
            <div className="flex-1 p-3 overflow-y-auto space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                  Find Creators
                </label>
                <div className="flex items-center bg-[#1A1A1A] border border-[#262626] focus-within:border-[#FF3D00] px-2.5 py-1.5 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-[#737373] mr-2" />
                  <input
                    type="text"
                    placeholder="Username or email address..."
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#FAFAFA] outline-none"
                  />
                </div>
              </div>

              {/* Search Matches */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-mono text-[9px] uppercase text-[#737373]">Search Results</span>
                  {searchResults.map((u) => {
                    const isFriend = friends.some((f) => f.id === u.id);
                    const isSent = outgoingRequests.some((r) => r.receiverId === u.id);
                    const displayName = u.name || u.username || u.email.split('@')[0];

                    return (
                      <div key={u.id} className="flex items-center justify-between p-2.5 bg-[#0F0F0F] border border-[#262626] rounded-xl">
                        <div className="flex items-center gap-2 truncate max-w-[170px]">
                          <div className="w-6 h-6 bg-[#FF3D00] text-[#0A0A0A] font-bold font-mono text-[10px] flex items-center justify-center shrink-0 rounded-md">
                            {displayName[0].toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-xs text-[#FAFAFA] font-bold truncate">{displayName}</div>
                            <div className="text-[10px] text-[#737373] font-mono truncate">{u.email}</div>
                          </div>
                        </div>

                        {isFriend ? (
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#10B981] text-[#10B981] bg-[#10B981]/10 font-bold rounded">
                            Friend ✓
                          </span>
                        ) : isSent ? (
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#262626] text-[#737373] rounded">
                            Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendFriendRequest(u.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#FF3D00] hover:bg-[#FF5722] text-[#0A0A0A] font-mono text-[10px] uppercase font-bold rounded-lg transition-colors"
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

              {/* Incoming Friend requests */}
              {incomingRequests.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF3D00] block mb-1">
                    Incoming Requests ({incomingRequests.length})
                  </span>
                  <div className="space-y-1.5">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-2.5 bg-[#0F0F0F] border border-[#FF3D00]/40 rounded-xl animate-pulse">
                        <span className="text-xs text-[#FAFAFA] font-bold">{req.senderName}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRespondFriendRequest(req.id, 'ACCEPTED')}
                            className="p-1 bg-[#10B981] text-[#0A0A0A] rounded hover:bg-[#10B981]/80 transition-colors"
                            title="Accept"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRespondFriendRequest(req.id, 'REJECTED')}
                            className="p-1 bg-[#FF3D00] text-[#0A0A0A] rounded hover:bg-[#FF5722] transition-colors"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends List directory */}
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373] block mb-1">
                  Your Friends ({friends.length})
                </span>
                <div className="space-y-1.5">
                  {friends.length === 0 ? (
                    <div className="text-center py-4 font-mono text-xs text-[#737373]">
                      No friends added yet.
                    </div>
                  ) : (
                    friends.map((f) => {
                      const isOnline = onlineUsers.has(f.id);
                      return (
                        <div key={f.id} className="flex items-center justify-between p-2.5 bg-[#0F0F0F] border border-[#262626] rounded-xl">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-7 h-7 bg-[#1A1A1A] border border-[#262626] font-mono text-[10px] text-[#FAFAFA] font-bold flex items-center justify-center rounded-lg">
                                {(f.name || f.username || f.email)[0].toUpperCase()}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 border border-[#0A0A0A] rounded-full ${
                                  isOnline ? 'bg-[#10B981]' : 'bg-[#737373]'
                                }`}
                              />
                            </div>
                            <div>
                              <div className="text-xs text-[#FAFAFA] font-bold">{f.name || f.username || f.email}</div>
                              <div className="text-[9px] text-[#737373] font-mono">{f.email}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIVE CONVERSATION MESSAGES CHAT (2/3 width) */}
        <div className="flex-1 flex overflow-hidden relative bg-[#0D0D0D]">
          
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 font-mono text-xs text-[#737373]">
              <div className="w-16 h-16 bg-[#141414] border border-[#262626] rounded-2xl flex items-center justify-center text-[#FF3D00] shadow-sm mb-2">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="uppercase max-w-sm leading-relaxed">
                Connect with collaborators in real-time. Select an active chat or add friends to open messaging cockpit.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              
              {/* Message Pane column */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Active Chat Header */}
                <div className="p-3 bg-[#0F0F0F] border-b border-[#262626] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#FF3D00] font-black text-xs text-[#0A0A0A] flex items-center justify-center rounded-xl font-mono uppercase">
                      {getInitials(activeConv.name || getChatPartner(activeConv)?.name || getChatPartner(activeConv)?.username || '?')}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#FAFAFA]">
                        {activeConv.name || getChatPartner(activeConv)?.name || getChatPartner(activeConv)?.username || 'Private Chat'}
                      </div>
                      <span className="font-mono text-[9px] text-[#737373]">
                        {activeConv.isGroup ? `${activeConv.members.length} members` : isPartnerOnline(activeConv) ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="p-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] rounded-lg transition-colors"
                      title="Inspect Chat Information"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Message List Pane */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080808]">
                  {messages.map((m) => {
                    const isMe = m.senderId === user?.id;
                    const isDeleted = m.type === 'DELETED';
                    const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    // Read check status
                    // In group: checked if more than 1 read receipt. In DM: checked if partner read.
                    const isRead = m.readBy.length > 1;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="font-mono text-[8px] text-[#737373] uppercase mb-0.5 px-1.5">
                          {m.senderName || 'Creator'}
                        </span>
                        
                        <div className="flex items-center gap-1.5 max-w-[85%]">
                          {/* Trash Delete icon hover option for sender */}
                          {isMe && !isDeleted && (
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[#737373] hover:text-[#FF3D00] transition-opacity duration-150"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div
                            className={`p-3 text-xs shadow-md ${
                              isDeleted
                                ? 'bg-transparent border border-[#262626] text-[#737373] italic rounded-2xl'
                                : isMe
                                ? 'bg-[#FF3D00]/10 border border-[#FF3D00] text-[#FAFAFA] rounded-2xl rounded-tr-none'
                                : 'bg-[#0F0F0F] border border-[#262626] text-[#FAFAFA] rounded-2xl rounded-tl-none'
                            }`}
                          >
                            <p className="break-words whitespace-pre-wrap">{m.content}</p>
                            
                            {/* Timestamp & checks block */}
                            <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] font-mono text-[#737373]">
                              <span>{timeStr}</span>
                              {isMe && !isDeleted && (
                                <span>
                                  {isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-[#4285F4]" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-[#737373]" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar Footer */}
                <div className="p-3 bg-[#0F0F0F] border-t border-[#262626] flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Type message content here..."
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] px-3.5 py-2.5 outline-none rounded-xl"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    className="p-2.5 bg-[#FF3D00] text-[#0A0A0A] font-bold hover:bg-[#FF5722] rounded-xl transition-all duration-150 active:scale-95 shrink-0"
                  >
                    <Send className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </div>

              {/* Collapsible Details Side Panel */}
              {showDetails && (
                <div className="w-[260px] border-l border-[#262626] bg-[#0F0F0F] flex flex-col overflow-hidden shrink-0 font-mono text-xs p-4 space-y-5 animate-in slide-in-from-right duration-200">
                  <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                    <span className="font-bold text-[#FAFAFA] uppercase tracking-wider">Chat Properties</span>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="p-1 text-[#737373] hover:text-[#FAFAFA] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Creation telemetry */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#737373]">
                      <Calendar className="w-3.5 h-3.5 text-[#FF3D00]" />
                      <span className="uppercase text-[9px]">Opened on</span>
                    </div>
                    <div className="text-[#FAFAFA] font-bold">
                      {new Date(activeConv.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Search message query */}
                  <div className="space-y-2 border-t border-[#262626] pt-4">
                    <span className="text-[#737373] uppercase text-[9px] block">Query Message History</span>
                    <div className="flex items-center bg-[#1A1A1A] border border-[#262626] px-2 py-1 rounded">
                      <Search className="w-3 h-3 text-[#737373] mr-1.5" />
                      <input
                        type="text"
                        placeholder="Keyword query..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="bg-transparent text-[11px] text-[#FAFAFA] outline-none w-full"
                      />
                    </div>
                    
                    {chatSearchQuery && (
                      <div className="max-h-[120px] overflow-y-auto space-y-2 pt-2 border-t border-[#1A1A1A] text-[10px]">
                        {filteredMessages.length === 0 ? (
                          <div className="text-center text-[#737373]">No matching keyword matches.</div>
                        ) : (
                          filteredMessages.map((m) => (
                            <div key={m.id} className="p-1.5 bg-[#141414] border border-[#262626] rounded">
                              <span className="font-bold text-[#FF3D00] block text-[8px]">{m.senderName}</span>
                              <p className="text-[#FAFAFA] line-clamp-2 mt-0.5">{m.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* List of members */}
                  <div className="space-y-3 border-t border-[#262626] pt-4 flex-1 overflow-y-auto">
                    <span className="text-[#737373] uppercase text-[9px] block">Chat Participants ({activeConv.members.length})</span>
                    <div className="space-y-2">
                      {activeConv.members.map((m: any) => {
                        const isOnline = onlineUsers.has(m.userId);
                        return (
                          <div key={m.userId} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-[#10B981]' : 'bg-[#737373]'}`} />
                              <span className="text-[#FAFAFA] truncate font-bold">{m.username || m.email.split('@')[0]}</span>
                            </div>
                            <span className="font-mono text-[8px] uppercase text-[#737373]">{m.role}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
