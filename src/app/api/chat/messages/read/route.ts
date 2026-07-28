import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { markMessagesAsRead } from '@/lib/chat-storage';
import { redis } from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId parameter is required' }, { status: 400 });
    }

    await markMessagesAsRead(conversationId, session.id);

    // Broadcast read event over Socket.io
    await redis.publish('socket-emit', JSON.stringify({
      room: `group:${conversationId}`,
      event: 'message:read',
      data: { conversationId, userId: session.id },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /chat/messages/read Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
