import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { prisma, isDbDisabled } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (!isDbDisabled()) {
      try {
        const messages = await prisma.chatMessage.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { username: true, email: true } },
            conversation: { select: { id: true, name: true, isGroup: true } },
          },
        });

        return NextResponse.json({
          messages: messages.map((m) => ({
            id: m.id,
            conversationId: m.conversationId,
            conversationName: m.conversation.name || (m.conversation.isGroup ? 'Group' : 'DM'),
            senderId: m.senderId,
            senderName: m.sender.username || m.sender.email,
            content: m.content,
            type: m.type,
            createdAt: m.createdAt.toISOString(),
          })),
        });
      } catch (err) {
        console.warn('[Admin Chat GET DB Error]:', err);
      }
    }

    return NextResponse.json({ messages: [] });
  } catch (error) {
    console.error('[API /admin/chat GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID parameter required' }, { status: 400 });
    }

    if (!isDbDisabled()) {
      try {
        await prisma.chatMessage.delete({
          where: { id: messageId },
        });
        return NextResponse.json({ success: true, messageId });
      } catch (err) {
        console.warn('[Admin Chat DELETE DB Error]:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /admin/chat DELETE Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
