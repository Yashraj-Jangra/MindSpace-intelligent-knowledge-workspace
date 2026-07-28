import { Client, GatewayIntentBits } from 'discord.js';
import { prisma } from '../db';

export async function generateDiscordPairingCode(userId: string): Promise<string> {
  const account = await prisma.discordAccount.findUnique({
    where: { userId }
  });

  const now = new Date();
  if (account?.pairingCode && account.codeCreatedAt) {
    const ageMs = now.getTime() - new Date(account.codeCreatedAt).getTime();
    if (ageMs < 15 * 60 * 1000) {
      return account.pairingCode;
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.discordAccount.upsert({
    where: { userId },
    update: { pairingCode: code, codeCreatedAt: now },
    create: {
      userId,
      pairingCode: code,
      codeCreatedAt: now,
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

  if (record.codeCreatedAt) {
    const ageMs = new Date().getTime() - new Date(record.codeCreatedAt).getTime();
    if (ageMs > 15 * 60 * 1000) {
      throw new Error('Pairing code has expired');
    }
  }

  return await prisma.discordAccount.update({
    where: { id: record.id },
    data: {
      discordUserId,
      discordUsername,
      isPaired: true,
      pairingCode: null, // Consume code
      codeCreatedAt: null,
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

let discordClient: Client | null = null;
async function getDiscordClient(token: string) {
  if (discordClient) return discordClient;
  discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });
  await discordClient.login(token);
  return discordClient;
}

export async function sendDiscordDm(token: string, userId: string, title: string, message: string) {
  try {
    const client = await getDiscordClient(token);
    const user = await client.users.fetch(userId);
    await user.send({
      embeds: [
        {
          title: `[MINDSPACE] ${title}`,
          description: message,
          color: 0xff3d00,
          timestamp: new Date().toISOString(),
          footer: { text: 'MindSpace AI Platform' },
        }
      ]
    });
  } catch (error) {
    console.error(`[Discord DM Error] Failed to send DM to user ${userId}:`, error);
  }
}
