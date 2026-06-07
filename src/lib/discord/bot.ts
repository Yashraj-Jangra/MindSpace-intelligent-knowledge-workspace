import { prisma } from '../db';

export async function generateDiscordPairingCode(userId: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.discordAccount.upsert({
    where: { userId },
    update: { pairingCode: code },
    create: {
      userId,
      pairingCode: code,
    },
  });

  return code;
}

export async function pairDiscordAccount(pairingCode: string, discordUserId: string, discordUsername: string) {
  const record = await prisma.discordAccount.findUnique({
    where: { pairingCode },
  });

  if (!record) {
    throw new Error('Invalid or expired pairing code');
  }

  return await prisma.discordAccount.update({
    where: { id: record.id },
    data: {
      discordUserId,
      discordUsername,
      isPaired: true,
      pairingCode: null, // Consume code
    },
  });
}

export async function sendDiscordNotification(webhookUrl: string, title: string, message: string, color = 0xff3d00) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `[MINDSPACE] ${title}`,
            description: message,
            color,
            timestamp: new Date().toISOString(),
            footer: { text: 'MindSpace AI Platform' },
          },
        ],
      }),
    });
  } catch (error) {
    console.error('[Discord Webhook Error]:', error);
  }
}
