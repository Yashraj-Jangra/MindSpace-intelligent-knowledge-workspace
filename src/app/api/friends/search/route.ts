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
    const rawQ = searchParams.get('q') || '';
    const q = rawQ.trim().toLowerCase();

    let dbUsers: any[] = [];
    if (!isDbDisabled()) {
      try {
        const whereClause: any = {
          id: { not: currentUserId },
        };

        if (q && q !== '*' && q !== 'all') {
          whereClause.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ];
        }

        dbUsers = await prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
          take: 20,
        });
      } catch (err) {
        console.warn('[Friends Search DB Error]:', err);
      }
    }

    // Local JSON Fallback Store Search
    const allLocalUsers = await getAllUsers();
    const localMatches = allLocalUsers
      .filter((u) => u.id !== currentUserId)
      .filter((u) => {
        if (!q || q === '*' || q === 'all') return true;
        return (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
        );
      })
      .map((u) => ({
        id: u.id,
        name: u.name || u.username || u.email.split('@')[0],
        username: u.username || u.name || u.email.split('@')[0],
        email: u.email,
      }));

    // Merge & deduplicate by email
    const userMap = new Map<string, any>();
    for (const u of [...dbUsers, ...localMatches]) {
      if (u.email && u.email.toLowerCase() !== session.email?.toLowerCase()) {
        const key = u.email.toLowerCase();
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: u.id,
            name: u.name || u.username || u.email.split('@')[0],
            username: u.username || u.name || u.email.split('@')[0],
            email: u.email,
          });
        }
      }
    }

    const mergedUsers = Array.from(userMap.values()).slice(0, 20);
    return NextResponse.json({ users: mergedUsers });
  } catch (error) {
    console.error('[API /friends/search GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
