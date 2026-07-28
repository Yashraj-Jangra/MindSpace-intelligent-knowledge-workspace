import { NextResponse } from 'next/server';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let discordAccount = null;
    let telegramAccount = null;

    if (!isDbDisabled()) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.id },
        });

        const dcAcc = await prisma.discordAccount.findUnique({
          where: { userId: session.id },
        });
        if (dcAcc) {
          let code = dcAcc.pairingCode;
          if (dcAcc.pairingCode && dcAcc.codeCreatedAt) {
            const ageMs = new Date().getTime() - new Date(dcAcc.codeCreatedAt).getTime();
            if (ageMs > 15 * 60 * 1000) {
              code = null;
              await prisma.discordAccount.update({
                where: { id: dcAcc.id },
                data: { pairingCode: null, codeCreatedAt: null },
              });
            }
          }
          discordAccount = {
            ...dcAcc,
            pairingCode: code,
            codeCreatedAt: code ? dcAcc.codeCreatedAt : null,
          };
        }

        const tgAcc = await prisma.telegramAccount.findUnique({
          where: { userId: session.id },
        });
        if (tgAcc) {
          let code = tgAcc.pairingCode;
          if (tgAcc.pairingCode && tgAcc.codeCreatedAt) {
            const ageMs = new Date().getTime() - new Date(tgAcc.codeCreatedAt).getTime();
            if (ageMs > 15 * 60 * 1000) {
              code = null;
              await prisma.telegramAccount.update({
                where: { id: tgAcc.id },
                data: { pairingCode: null, codeCreatedAt: null },
              });
            }
          }
          telegramAccount = {
            ...tgAcc,
            pairingCode: code,
            codeCreatedAt: code ? tgAcc.codeCreatedAt : null,
          };
        }

        if (user) {
          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            discordAccount,
            telegramAccount,
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
      discordAccount: null,
      telegramAccount: null,
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
