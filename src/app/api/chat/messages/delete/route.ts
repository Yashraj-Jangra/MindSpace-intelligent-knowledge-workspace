import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { deleteChatMessage } from '@/lib/chat-storage';
import { redis } from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await req.json();

    if (!messageId) {
      return NextResponse.json({ error: 'messageId parameter is required' }, { status: 400 });
    }

    const deleted = await deleteChatMessage(messageId, session.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete message or forbidden' }, { status: 403 });
    }

    // Broadcast delete event over Socket.io
    await redis.publish('socket-emit', JSON.stringify({
      room: `group:${deleted.conversationId}`,
      event: 'message:deleted',
      data: { messageId, conversationId: deleted.conversationId },
    }));

    return NextResponse.json({ success: true, message: deleted });
  } catch (error) {
    console.error('[API /chat/messages/delete Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
