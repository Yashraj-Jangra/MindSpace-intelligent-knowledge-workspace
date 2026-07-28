import { NextResponse } from 'next/server';
import { generateTelegramPairingCode } from '@/lib/telegram/bot';
import { prisma } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const account = await prisma.telegramAccount.findUnique({
      where: { userId },
    });

    return NextResponse.json({ account });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    let action = 'generate-code';
    try {
      const body = await req.json();
      action = body.action || 'generate-code';
    } catch (e) {
      // Body may be empty
    }

    if (action === 'unlink') {
      const account = await prisma.telegramAccount.update({
        where: { userId },
        data: {
          isPaired: false,
          telegramChatId: '',
          username: null,
          pairingCode: null,
          codeCreatedAt: null,
        },
      });
      return NextResponse.json({ account, success: true });
    }

    const code = await generateTelegramPairingCode(userId);
    return NextResponse.json({ code });
  } catch (error) {
    console.error('[API /telegram/pair Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
