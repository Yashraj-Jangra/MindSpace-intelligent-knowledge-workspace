import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import {
  getFriendRequests,
  createFriendRequest,
  updateFriendRequestStatus,
  createConversation,
} from '@/lib/chat-storage';
import { prisma, isDbDisabled } from '@/lib/db';
import { redis } from '@/lib/redis';
import { getAllUsers } from '@/lib/auth-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const requests = await getFriendRequests(userId);

    // Accepted friends list
    const acceptedRequests = requests.filter((r) => r.status === 'ACCEPTED');
    const friendUserIds = acceptedRequests.map((r) =>
      r.senderId === userId ? r.receiverId : r.senderId
    );

    let friends: any[] = [];
    if (!isDbDisabled() && friendUserIds.length > 0) {
      try {
        const dbUsers = await prisma.user.findMany({
          where: { id: { in: friendUserIds } },
          select: { id: true, name: true, username: true, email: true, role: true },
        });
        friends = dbUsers;
      } catch (err) {
        console.warn('[Friends GET DB Error]:', err);
      }
    }

    if (friends.length === 0 && friendUserIds.length > 0) {
      const allUsers = await getAllUsers();
      friends = allUsers
        .filter((u) => friendUserIds.includes(u.id))
        .map((u) => ({
          id: u.id,
          name: u.name || u.username || u.email.split('@')[0],
          username: u.username || u.name || u.email.split('@')[0],
          email: u.email,
          role: u.role,
        }));
    }

    const pendingIncoming = requests.filter((r) => r.receiverId === userId && r.status === 'PENDING');
    const pendingOutgoing = requests.filter((r) => r.senderId === userId && r.status === 'PENDING');

    return NextResponse.json({
      friends,
      incomingRequests: pendingIncoming,
      outgoingRequests: pendingOutgoing,
    });
  } catch (error) {
    console.error('[API /friends GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const senderId = session.id;

    const { targetUserId } = await req.json();
    if (!targetUserId || targetUserId === senderId) {
      return NextResponse.json({ error: 'Invalid target user ID' }, { status: 400 });
    }

    const request = await createFriendRequest(senderId, targetUserId);

    // Notify recipient via Socket.io
    await redis.publish('socket-emit', JSON.stringify({
      room: `user:${targetUserId}`,
      event: 'friend:request',
      data: request,
    }));

    return NextResponse.json({ request });
  } catch (error) {
    console.error('[API /friends POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const { requestId, status } = await req.json();
    if (!requestId || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const updated = await updateFriendRequestStatus(requestId, status);
    if (!updated) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // If accepted, automatically initialize DM conversation between both users!
    if (status === 'ACCEPTED') {
      const dmConv = await createConversation(false, [updated.senderId, updated.receiverId]);

      // Emit socket notification to both users
      await redis.publish('socket-emit', JSON.stringify({
        room: `user:${updated.senderId}`,
        event: 'friend:accepted',
        data: { conversation: dmConv },
      }));
      await redis.publish('socket-emit', JSON.stringify({
        room: `user:${updated.receiverId}`,
        event: 'friend:accepted',
        data: { conversation: dmConv },
      }));
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error('[API /friends PATCH Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
