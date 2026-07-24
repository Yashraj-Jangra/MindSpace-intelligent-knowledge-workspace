import { NextResponse } from 'next/server';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!isDbDisabled()) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.id },
        });

        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify old password
        if (user.passwordHash) {
          const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
          if (!isPasswordValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
          }
        }

        // Hash and save new password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
          where: { id: session.id },
          data: { passwordHash },
        });

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    return NextResponse.json({ success: true, mock: true, message: 'Mock password updated' });
  } catch (error) {
    console.error('[API /auth/password POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
