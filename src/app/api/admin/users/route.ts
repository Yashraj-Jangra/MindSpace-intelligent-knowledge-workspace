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

    if (!isDbDisabled()) {
      try {
        const users = await prisma.user.findMany({
          select: {
            id: true,
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

        return NextResponse.json({ users });
      } catch (err) {
        console.warn('[Admin Users GET DB Error]:', err);
      }
    }

    const jsonUsers = await getAllUsers();
    return NextResponse.json({ users: jsonUsers });
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
