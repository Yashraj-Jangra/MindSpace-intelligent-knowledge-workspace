import { NextResponse } from 'next/server';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDbDisabled()) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.id },
        });

        if (user) {
          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          });
        }
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role || 'USER',
      },
      mock: true,
    });
  } catch (error) {
    console.error('[API /auth/profile GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isDbDisabled()) {
      try {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser && existingUser.id !== session.id) {
          return NextResponse.json({ error: 'Email address is already in use' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
          where: { id: session.id },
          data: {
            name,
            email,
          },
        });

        return NextResponse.json({
          success: true,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
          },
        });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.id,
        email,
        name,
        role: 'USER',
      },
      mock: true,
    });
  } catch (error) {
    console.error('[API /auth/profile POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
