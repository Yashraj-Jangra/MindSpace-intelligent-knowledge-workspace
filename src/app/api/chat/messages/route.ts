import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getConversationMessages, createChatMessage } from '@/lib/chat-storage';
import { redis } from '@/lib/redis';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId parameter required' }, { status: 400 });
    }

    const messages = await getConversationMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[API /chat/messages GET Error]:', error);
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

    const { conversationId, content, type } = await req.json();

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 });
    }

    const message = await createChatMessage(conversationId, senderId, content, type || 'TEXT');

    // Broadcast to conversation room over Socket.io
    await redis.publish('socket-emit', JSON.stringify({
      room: `group:${conversationId}`,
      event: 'message:new',
      data: message,
    }));

    return NextResponse.json({ message });
  } catch (error) {
    console.error('[API /chat/messages POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
