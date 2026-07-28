import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { prisma, isDbDisabled } from '@/lib/db';
import { getAllUsers } from '@/lib/auth-storage';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = session.id;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    if (!q) {
      return NextResponse.json({ users: [] });
    }

    if (!isDbDisabled()) {
      try {
        const users = await prisma.user.findMany({
          where: {
            id: { not: currentUserId },
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
          take: 15,
        });

        return NextResponse.json({ users });
      } catch (err) {
        console.warn('[Friends Search DB Error]:', err);
      }
    }

    // Local JSON Fallback Store Search
    const allUsers = await getAllUsers();
    const filteredUsers = allUsers
      .filter((u) => u.id !== currentUserId)
      .filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q)
      )
      .slice(0, 15)
      .map((u) => ({
        id: u.id,
        name: u.name || u.username || u.email.split('@')[0],
        username: u.username || u.name || u.email.split('@')[0],
        email: u.email,
      }));

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('[API /friends/search GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
