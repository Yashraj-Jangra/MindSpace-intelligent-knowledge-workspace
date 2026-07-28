import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';

export interface StoredFriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  createdAt: string;
  senderName?: string;
  receiverName?: string;
}

export interface StoredConversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  iconUrl: string | null;
  inviteToken: string | null;
  inviteExpiry: string | null;
  createdAt: string;
  members: {
    userId: string;
    role: string;
    username?: string | null;
    email?: string | null;
  }[];
  lastMessage?: StoredChatMessage | null;
}

export interface StoredChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'NOTE_CARD' | 'CANVAS_CARD';
  readBy: string[];
  createdAt: string;
}

export interface StoredCanvasCollaborator {
  id: string;
  canvasId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  invitedAt: string;
  username?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const CHAT_FILE = path.join(DATA_DIR, 'chat.json');

interface ChatStore {
  friendRequests: StoredFriendRequest[];
  conversations: StoredConversation[];
  messages: StoredChatMessage[];
  collaborators: StoredCanvasCollaborator[];
}

function ensureFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHAT_FILE)) {
    const initial: ChatStore = {
      friendRequests: [],
      conversations: [],
      messages: [],
      collaborators: [],
    };
    fs.writeFileSync(CHAT_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

function readChatStore(): ChatStore {
  try {
    ensureFileExists();
    const raw = fs.readFileSync(CHAT_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { friendRequests: [], conversations: [], messages: [], collaborators: [] };
  }
}

function writeChatStore(store: ChatStore) {
  try {
    ensureFileExists();
    fs.writeFileSync(CHAT_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[writeChatStore Error]:', err);
  }
}

// ---------------- FRIEND REQUESTS ----------------

export async function getFriendRequests(userId: string): Promise<StoredFriendRequest[]> {
  if (!isDbDisabled()) {
    try {
      const requests = await prisma.friendRequest.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: {
          sender: { select: { name: true, username: true, email: true } },
          receiver: { select: { name: true, username: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return requests.map((r) => ({
        id: r.id,
        senderId: r.senderId,
        receiverId: r.receiverId,
        status: r.status as any,
        createdAt: r.createdAt.toISOString(),
        senderName: r.sender.name || r.sender.username || r.sender.email,
        receiverName: r.receiver.name || r.receiver.username || r.receiver.email,
      }));
    } catch (err) {
      console.warn('[Chat Storage] DB friend request fetch failed:', err);
    }
  }

  const store = readChatStore();
  return store.friendRequests.filter((r) => r.senderId === userId || r.receiverId === userId);
}

export async function createFriendRequest(
  senderId: string,
  receiverId: string
): Promise<StoredFriendRequest> {
  if (!isDbDisabled()) {
    try {
      // Check existing request
      const existing = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId },
          ],
        },
        include: {
          sender: { select: { name: true, username: true, email: true } },
          receiver: { select: { name: true, username: true, email: true } },
        },
      });

      if (existing) {
        return {
          id: existing.id,
          senderId: existing.senderId,
          receiverId: existing.receiverId,
          status: existing.status as any,
          createdAt: existing.createdAt.toISOString(),
          senderName: existing.sender.name || existing.sender.username || existing.sender.email,
          receiverName: existing.receiver.name || existing.receiver.username || existing.receiver.email,
        };
      }

      const created = await prisma.friendRequest.create({
        data: { senderId, receiverId, status: 'PENDING' },
        include: {
          sender: { select: { name: true, username: true, email: true } },
          receiver: { select: { name: true, username: true, email: true } },
        },
      });
      return {
        id: created.id,
        senderId: created.senderId,
        receiverId: created.receiverId,
        status: created.status as any,
        createdAt: created.createdAt.toISOString(),
        senderName: created.sender.name || created.sender.username || created.sender.email,
        receiverName: created.receiver.name || created.receiver.username || created.receiver.email,
      };
    } catch (err) {
      console.warn('[Chat Storage] DB friend request create failed:', err);
    }
  }

  const store = readChatStore();
  const existingLocal = store.friendRequests.find(
    (r) => (r.senderId === senderId && r.receiverId === receiverId) || (r.senderId === receiverId && r.receiverId === senderId)
  );

  if (existingLocal) {
    return existingLocal;
  }

  const newReq: StoredFriendRequest = {
    id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderId,
    receiverId,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  store.friendRequests.push(newReq);
  writeChatStore(store);
  return newReq;
}

export async function updateFriendRequestStatus(
  id: string,
  status: 'ACCEPTED' | 'REJECTED' | 'BLOCKED'
): Promise<StoredFriendRequest | null> {
  if (!isDbDisabled()) {
    try {
      const updated = await prisma.friendRequest.update({
        where: { id },
        data: { status },
        include: {
          sender: { select: { username: true, email: true } },
          receiver: { select: { username: true, email: true } },
        },
      });
      return {
        id: updated.id,
        senderId: updated.senderId,
        receiverId: updated.receiverId,
        status: updated.status as any,
        createdAt: updated.createdAt.toISOString(),
        senderName: updated.sender.username || updated.sender.email,
        receiverName: updated.receiver.username || updated.receiver.email,
      };
    } catch (err) {
      console.warn('[Chat Storage] DB friend request update failed:', err);
      disableDbCircuitBreaker();
    }
  }

  const store = readChatStore();
  const req = store.friendRequests.find((r) => r.id === id);
  if (!req) return null;
  req.status = status;
  writeChatStore(store);
  return req;
}

// ---------------- CONVERSATIONS ----------------

export async function getUserConversations(userId: string): Promise<StoredConversation[]> {
  if (!isDbDisabled()) {
    try {
      const convs = await prisma.conversation.findMany({
        where: {
          members: { some: { userId } },
        },
        include: {
          members: {
            include: { user: { select: { username: true, email: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { username: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return convs.map((c) => ({
        id: c.id,
        name: c.name,
        isGroup: c.isGroup,
        iconUrl: c.iconUrl,
        inviteToken: c.inviteToken,
        inviteExpiry: c.inviteExpiry ? c.inviteExpiry.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        members: c.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          username: m.user.username,
          email: m.user.email,
        })),
        lastMessage: c.messages[0]
          ? {
              id: c.messages[0].id,
              conversationId: c.messages[0].conversationId,
              senderId: c.messages[0].senderId,
              senderName: c.messages[0].sender.username || c.messages[0].sender.email,
              content: c.messages[0].content,
              type: c.messages[0].type as any,
              readBy: c.messages[0].readBy,
              createdAt: c.messages[0].createdAt.toISOString(),
            }
          : null,
      }));
    } catch (err) {
      console.warn('[Chat Storage] DB conversation list fetch failed:', err);
      disableDbCircuitBreaker();
    }
  }

  const store = readChatStore();
  return store.conversations.filter((c) => c.members.some((m) => m.userId === userId));
}

export async function createConversation(
  isGroup: boolean,
  memberUserIds: string[],
  name?: string
): Promise<StoredConversation> {
  const inviteToken = isGroup
    ? `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    : null;

  if (!isDbDisabled()) {
    try {
      const created = await prisma.conversation.create({
        data: {
          isGroup,
          name: name || null,
          inviteToken,
          members: {
            create: memberUserIds.map((uid, index) => ({
              userId: uid,
              role: index === 0 && isGroup ? 'ADMIN' : 'MEMBER',
            })),
          },
        },
        include: {
          members: {
            include: { user: { select: { username: true, email: true } } },
          },
        },
      });

      return {
        id: created.id,
        name: created.name,
        isGroup: created.isGroup,
        iconUrl: created.iconUrl,
        inviteToken: created.inviteToken,
        inviteExpiry: created.inviteExpiry ? created.inviteExpiry.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        members: created.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          username: m.user.username,
          email: m.user.email,
        })),
        lastMessage: null,
      };
    } catch (err) {
      console.warn('[Chat Storage] DB conversation create failed:', err);
      disableDbCircuitBreaker();
    }
  }

  const store = readChatStore();
  const newConv: StoredConversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name || null,
    isGroup,
    iconUrl: null,
    inviteToken,
    inviteExpiry: null,
    createdAt: new Date().toISOString(),
    members: memberUserIds.map((uid, idx) => ({
      userId: uid,
      role: idx === 0 && isGroup ? 'ADMIN' : 'MEMBER',
    })),
    lastMessage: null,
  };

  store.conversations.push(newConv);
  writeChatStore(store);
  return newConv;
}

// ---------------- MESSAGES ----------------

export async function getConversationMessages(
  conversationId: string
): Promise<StoredChatMessage[]> {
  if (!isDbDisabled()) {
    try {
      const msgs = await prisma.chatMessage.findMany({
        where: { conversationId },
        include: { sender: { select: { username: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.sender.username || m.sender.email,
        content: m.content,
        type: m.type as any,
        readBy: m.readBy,
        createdAt: m.createdAt.toISOString(),
      }));
    } catch (err) {
      console.warn('[Chat Storage] DB messages fetch failed:', err);
      disableDbCircuitBreaker();
    }
  }

  const store = readChatStore();
  return store.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function createChatMessage(
  conversationId: string,
  senderId: string,
  content: string,
  type: 'TEXT' | 'IMAGE' | 'NOTE_CARD' | 'CANVAS_CARD' = 'TEXT'
): Promise<StoredChatMessage> {
  if (!isDbDisabled()) {
    try {
      const msg = await prisma.chatMessage.create({
        data: {
          conversationId,
          senderId,
          content,
          type,
          readBy: [senderId],
        },
        include: { sender: { select: { username: true, email: true } } },
      });

      return {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: msg.sender.username || msg.sender.email,
        content: msg.content,
        type: msg.type as any,
        readBy: msg.readBy,
        createdAt: msg.createdAt.toISOString(),
      };
    } catch (err) {
      console.warn('[Chat Storage] DB create message failed:', err);
      disableDbCircuitBreaker();
    }
  }

  const store = readChatStore();
  const newMsg: StoredChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    conversationId,
    senderId,
    content,
    type,
    readBy: [senderId],
    createdAt: new Date().toISOString(),
  };

  store.messages.push(newMsg);
  writeChatStore(store);
  return newMsg;
}
