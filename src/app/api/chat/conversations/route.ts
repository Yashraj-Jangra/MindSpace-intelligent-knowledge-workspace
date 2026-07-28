import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getUserConversations, createConversation } from '@/lib/chat-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const conversations = await getUserConversations(userId);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[API /chat/conversations GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const { name, isGroup, memberIds } = await req.json();

    const allMembers = Array.from(new Set([userId, ...(memberIds || [])]));
    const conv = await createConversation(Boolean(isGroup), allMembers, name);

    return NextResponse.json({ conversation: conv });
  } catch (error) {
    console.error('[API /chat/conversations POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
