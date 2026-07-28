import { Bot } from 'grammy';
import { prisma } from '../db';
import { getSystemSetting } from '../settings';

let globalBotInstance: Bot | null = null;

export async function getTelegramBot(userToken?: string | null): Promise<Bot | null> {
  if (userToken) {
    return new Bot(userToken);
  }
  
  if (globalBotInstance) {
    return globalBotInstance;
  }

  const token = await getSystemSetting('TELEGRAM_BOT_TOKEN');
  if (!token) return null;

  globalBotInstance = new Bot(token);
  return globalBotInstance;
}

export async function generateTelegramPairingCode(userId: string): Promise<string> {
  const account = await prisma.telegramAccount.findUnique({
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

  await prisma.telegramAccount.upsert({
    where: { userId },
    update: { pairingCode: code, codeCreatedAt: now },
    create: {
      userId,
      pairingCode: code,
      telegramChatId: '',
      codeCreatedAt: now,
    },
  });

  return code;
}

export async function pairTelegramAccount(pairingCode: string, telegramChatId: string, username?: string) {
  const record = await prisma.telegramAccount.findUnique({
    where: { pairingCode },
  });

  if (!record) {
    throw new Error('Invalid or expired pairing code');
  }

  if (record.codeCreatedAt) {
    const ageMs = new Date().getTime() - new Date(record.codeCreatedAt).getTime();
    if (ageMs > 15 * 60 * 1000) {
      await prisma.telegramAccount.update({
        where: { id: record.id },
        data: { pairingCode: null, codeCreatedAt: null },
      });
      throw new Error('Pairing code has expired');
    }
  }

  return await prisma.telegramAccount.update({
    where: { id: record.id },
    data: {
      telegramChatId,
      username: username || null,
      isPaired: true,
      pairingCode: null, // Consume code
      codeCreatedAt: null,
    },
  });
}

export async function sendTelegramNotification(
  userId: string,
  title: string,
  message: string,
  overrideChatId?: string | null
) {
  try {
    const account = await prisma.telegramAccount.findUnique({
      where: { userId },
    });
    
    if (!account || !account.isPaired) {
      return;
    }

    const chatId = overrideChatId || account.telegramChatId;
    const bot = await getTelegramBot(account.botToken);
    
    if (!bot) {
      console.warn(`[Telegram Notifications] No Bot Token configured for user ${userId} or global fallback`);
      return;
    }

    const text = `🔔 *[MINDSPACE] ${title}*\n\n${message}`;
    await bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error(`[Telegram Notification Error] Failed to send to user ${userId}:`, error);
  }
}
