import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { prisma, isDbDisabled } from '@/lib/db';
import { getAllUsers } from '@/lib/auth-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let dbUsers: any[] = [];
    if (!isDbDisabled()) {
      try {
        dbUsers = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            createdAt: true,
            discordAccount: { select: { isPaired: true, discordUsername: true } },
            telegramAccount: { select: { isPaired: true, username: true } },
            _count: {
              select: {
                notes: true,
                canvases: true,
                tasks: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('[Admin Users GET DB Error]:', err);
      }
    }

    const localUsers = await getAllUsers();
    const userMap = new Map<string, any>();

    for (const u of dbUsers) {
      userMap.set(u.email.toLowerCase(), {
        ...u,
        name: u.name || u.username || u.email.split('@')[0],
        username: u.username || u.name || u.email.split('@')[0],
      });
    }

    for (const u of localUsers) {
      const key = u.email.toLowerCase();
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: u.id,
          name: u.name || u.username || u.email.split('@')[0],
          username: u.username || u.name || u.email.split('@')[0],
          email: u.email,
          role: u.role || 'USER',
          createdAt: u.createdAt || new Date().toISOString(),
          _count: { notes: 0, canvases: 0, tasks: 0 },
        });
      }
    }

    const mergedUsers = Array.from(userMap.values());
    return NextResponse.json({ users: mergedUsers });
  } catch (error) {
    console.error('[API /admin/users GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, role } = await req.json();

    if (!userId || !['ADMIN', 'USER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
    }

    if (!isDbDisabled()) {
      try {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { role: role as 'ADMIN' | 'USER' },
          select: { id: true, email: true, username: true, role: true },
        });
        return NextResponse.json({ user: updated });
      } catch (err) {
        console.warn('[Admin Users PATCH DB Error]:', err);
      }
    }

    return NextResponse.json({ success: true, userId, role });
  } catch (error) {
    console.error('[API /admin/users PATCH Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
