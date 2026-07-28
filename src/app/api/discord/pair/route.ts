import { NextResponse } from 'next/server';
import { generateDiscordPairingCode, pairDiscordAccount } from '@/lib/discord/bot';
import { prisma } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const account = await prisma.discordAccount.findUnique({
      where: { userId },
    });

    return NextResponse.json({ account });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, pairingCode, discordUserId, discordUsername, webhookUrl } = body;

    // Discord Bot completes pairing externally via code lookup (no session cookie)
    if (action === 'pair') {
      if (!pairingCode || !discordUserId) {
        return NextResponse.json({ error: 'pairingCode and discordUserId are required' }, { status: 400 });
      }
      const account = await pairDiscordAccount(pairingCode, discordUserId, discordUsername || 'DiscordUser');
      return NextResponse.json({ account, success: true });
    }

    // Front-end client actions (require active session check)
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    if (action === 'generate-code') {
      const code = await generateDiscordPairingCode(userId);
      return NextResponse.json({ pairingCode: code });
    }

    if (action === 'set-webhook') {
      const account = await prisma.discordAccount.upsert({
        where: { userId },
        update: { webhookUrl },
        create: { userId, webhookUrl },
      });
      return NextResponse.json({ account });
    }

    if (action === 'unlink') {
      const account = await prisma.discordAccount.update({
        where: { userId },
        data: {
          isPaired: false,
          discordUserId: null,
          discordUsername: null,
          pairingCode: null,
          codeCreatedAt: null,
        },
      });
      return NextResponse.json({ account, success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API /discord/pair Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
