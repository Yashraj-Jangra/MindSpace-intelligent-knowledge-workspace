import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { prisma, isDbDisabled } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!isDbDisabled()) {
      try {
        const conv = await prisma.conversation.findUnique({
          where: { inviteToken: token },
          select: {
            id: true,
            name: true,
            isGroup: true,
            iconUrl: true,
            createdAt: true,
          },
        });
        if (conv) return NextResponse.json({ conversation: conv });
      } catch (err) {
        console.warn('[Invite GET DB Error]:', err);
      }
    }

    return NextResponse.json({ error: 'Invite link not found' }, { status: 404 });
  } catch (error) {
    console.error('[API /invite/[token] GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;
    const { token } = await params;

    if (!isDbDisabled()) {
      try {
        const conv = await prisma.conversation.findUnique({
          where: { inviteToken: token },
        });

        if (!conv) {
          return NextResponse.json({ error: 'Invite link not found or expired' }, { status: 404 });
        }

        await prisma.conversationMember.upsert({
          where: {
            conversationId_userId: {
              conversationId: conv.id,
              userId,
            },
          },
          update: {},
          create: {
            conversationId: conv.id,
            userId,
            role: 'MEMBER',
          },
        });

        return NextResponse.json({ success: true, conversationId: conv.id });
      } catch (err) {
        console.warn('[Invite POST DB Error]:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /invite/[token] POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
