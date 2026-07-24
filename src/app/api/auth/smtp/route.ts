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
        const config = await prisma.smtpConfig.findUnique({
          where: { userId: session.id },
        });
        return NextResponse.json({ config });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    return NextResponse.json({ config: null });
  } catch (error) {
    console.error('[API /auth/smtp GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { host, port, username, password, fromEmail } = await req.json();

    if (!host || !port || !username || !password || !fromEmail) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!isDbDisabled()) {
      try {
        const config = await prisma.smtpConfig.upsert({
          where: { userId: session.id },
          update: {
            host,
            port: Number(port),
            username,
            password,
            fromEmail,
          },
          create: {
            userId: session.id,
            host,
            port: Number(port),
            username,
            password,
            fromEmail,
          },
        });
        return NextResponse.json({ config, success: true });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    const mockConfig = {
      id: `smtp_${Date.now()}`,
      userId: session.id,
      host,
      port: Number(port),
      username,
      fromEmail,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ config: mockConfig, success: true, mock: true });
  } catch (error) {
    console.error('[API /auth/smtp POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
