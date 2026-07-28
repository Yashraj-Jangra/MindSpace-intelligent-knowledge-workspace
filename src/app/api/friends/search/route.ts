import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { prisma, isDbDisabled } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = session.id;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ users: [] });
    }

    if (!isDbDisabled()) {
      try {
        const users = await prisma.user.findMany({
          where: {
            id: { not: currentUserId },
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            username: true,
            email: true,
          },
          take: 10,
        });

        return NextResponse.json({ users });
      } catch (err) {
        console.warn('[Friends Search DB Error]:', err);
      }
    }

    return NextResponse.json({ users: [] });
  } catch (error) {
    console.error('[API /friends/search GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
