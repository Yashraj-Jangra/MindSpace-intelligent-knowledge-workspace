import { NextResponse } from 'next/server';
import { generateDiscordPairingCode, pairDiscordAccount } from '@/lib/discord/bot';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';

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
    const { action, userId = 'default_user', pairingCode, discordUserId, discordUsername, webhookUrl } = await req.json();

    if (action === 'generate-code') {
      const code = await generateDiscordPairingCode(userId);
      return NextResponse.json({ pairingCode: code });
    }

    if (action === 'pair') {
      if (!pairingCode || !discordUserId) {
        return NextResponse.json({ error: 'pairingCode and discordUserId are required' }, { status: 400 });
      }
      const account = await pairDiscordAccount(pairingCode, discordUserId, discordUsername || 'DiscordUser');
      return NextResponse.json({ account, success: true });
    }

    if (action === 'set-webhook') {
      const account = await prisma.discordAccount.upsert({
        where: { userId },
        update: { webhookUrl },
        create: { userId, webhookUrl },
      });
      return NextResponse.json({ account });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API /discord/pair Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
