import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { prisma, isDbDisabled } from '@/lib/db';
import { getAllUsers, updateUserRole, updateUserAdmin, deleteUser } from '@/lib/auth-storage';
import bcrypt from 'bcryptjs';

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
      if (u.email) {
        userMap.set(u.email.toLowerCase(), {
          ...u,
          name: u.name || u.username || u.email.split('@')[0],
          username: u.username || u.name || u.email.split('@')[0],
        });
      }
    }

    for (const u of localUsers) {
      if (u.email) {
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
        } else {
          // Sync role from local if set
          const existing = userMap.get(key);
          if (u.role === 'ADMIN' && existing.role !== 'ADMIN') {
            existing.role = 'ADMIN';
          }
        }
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

    const { userId, role, name, email, password } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const updateData: any = {};
    if (role !== undefined) {
      if (!['ADMIN', 'USER'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (email !== undefined) {
      updateData.email = email.toLowerCase().trim();
    }
    if (password !== undefined && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    await updateUserAdmin(userId, updateData);
    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('[API /admin/users PATCH Error]:', error);
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (userId === session.id) {
      return NextResponse.json({ error: 'Self-deletion is blocked for protection.' }, { status: 400 });
    }

    await deleteUser(userId);
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[API /admin/users DELETE Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
