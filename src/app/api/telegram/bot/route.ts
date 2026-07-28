import { NextResponse } from 'next/server';
import { Bot, webhookCallback } from 'grammy';
import { prisma, isDbDisabled } from '@/lib/db';
import { getSystemSetting } from '@/lib/settings';
import { pairTelegramAccount } from '@/lib/telegram/bot';
import { parseSnoozePhrase } from '@/lib/snooze-parser';
import { redis } from '@/lib/redis';

// Lazily load Telegram Bot callback handler
let nextBotCallback: any = null;

async function getBotCallbackHandler() {
  if (nextBotCallback) return nextBotCallback;

  const botToken = await getSystemSetting('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured in MindSpace settings.');
  }

  const bot = new Bot(botToken);

  // Helper resolver
  async function getUserIdByChatId(chatId: number) {
    const acc = await prisma.telegramAccount.findFirst({
      where: { telegramChatId: chatId.toString(), isPaired: true }
    });
    return acc?.userId || null;
  }

  // Onboarding
  bot.command('start', (ctx) => {
    ctx.reply(
      `👋 <b>Welcome to MindSpace Bot Companion!</b>\n\n` +
      `This bot acts as a remote control for your visual note-taking canvas and tasks.\n\n` +
      `<b>How to pair:</b>\n` +
      `1. Open the MindSpace Web UI\n` +
      `2. Open the Settings Drawer (click your profile image)\n` +
      `3. Go to the <b>Telegram</b> tab and copy your pairing code\n` +
      `4. Send here: <code>/pair &lt;pairing_code&gt;</code>`,
      { parse_mode: 'HTML' }
    );
  });

  // Pairing command
  bot.command('pair', async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) {
      return ctx.reply('Please specify a pairing code, e.g. <code>/pair 123456</code>', { parse_mode: 'HTML' });
    }
    try {
      const account = await pairTelegramAccount(code, ctx.chat.id.toString(), ctx.from?.username);
      const escapedUsername = (account.username || 'user').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      ctx.reply(`✅ <b>Account successfully paired!</b>\nWelcome to MindSpace, ${escapedUsername}!`, { parse_mode: 'HTML' });
    } catch (err) {
      const escapedError = ((err as Error).message || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      ctx.reply(`❌ <b>Pairing failed:</b> ${escapedError}`, { parse_mode: 'HTML' });
    }
  });

  // Task listing
  bot.command('tasks', async (ctx) => {
    const userId = await getUserIdByChatId(ctx.chat.id);
    if (!userId) return ctx.reply('❌ Your Telegram account is not paired. Please run `/pair <code>` first.');

    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      orderBy: { priority: 'desc' },
      take: 10,
    });

    if (tasks.length === 0) {
      return ctx.reply('✅ You have no pending tasks!');
    }

    const taskLines = tasks.map((t) => {
      const priorityBadge = `\`[${t.priority}]\``;
      const dueStr = t.dueAt ? `(Due: ${new Date(t.dueAt).toLocaleDateString()})` : '';
      return `- **${t.title}** ${priorityBadge} ${dueStr} \`ID: ${t.id}\``;
    }).join('\n');

    ctx.reply(`📋 **Your Pending Tasks (Top 10):**\n\n${taskLines}`, { parse_mode: 'Markdown' });
  });

  // Mark task completed
  bot.command('done', async (ctx) => {
    const userId = await getUserIdByChatId(ctx.chat.id);
    if (!userId) return ctx.reply('❌ Account not paired.');

    const taskId = ctx.match?.trim();
    if (!taskId) {
      return ctx.reply('Please specify the task ID, e.g. \`/done <id>\`', { parse_mode: 'Markdown' });
    }

    try {
      const task = await prisma.task.update({
        where: { id: taskId, userId },
        data: { status: 'DONE', completedAt: new Date() },
      });

      // Sync Client
      await redis.publish('socket-emit', JSON.stringify({
        room: `user:${userId}`,
        event: 'task:done',
        data: task,
      }));

      ctx.reply(`✅ Task **${task.title}** marked as done!`, { parse_mode: 'Markdown' });
    } catch (err) {
      ctx.reply('❌ Failed to complete task. Make sure the task ID is correct.');
    }
  });

  // Capture inbox
  bot.command('capture', async (ctx) => {
    const userId = await getUserIdByChatId(ctx.chat.id);
    if (!userId) return ctx.reply('❌ Account not paired.');

    const text = ctx.match?.trim();
    if (!text) {
      return ctx.reply('Please specify text to capture, e.g. \`/capture Read research paper\`', { parse_mode: 'Markdown' });
    }

    await prisma.capture.create({
      data: {
        userId,
        rawText: text,
        status: 'PENDING',
      },
    });

    ctx.reply('📥 Saved message to your **Quick Capture Inbox**!', { parse_mode: 'Markdown' });
  });

  // Create reminder
  bot.command('remind', async (ctx) => {
    const userId = await getUserIdByChatId(ctx.chat.id);
    if (!userId) return ctx.reply('❌ Account not paired.');

    const arg = ctx.match?.trim();
    if (!arg) {
      return ctx.reply('Format: \`/remind message | when\`\nExample: \`/remind Call team | tomorrow at 3pm\`', { parse_mode: 'Markdown' });
    }

    let message = '';
    let whenPhrase = '';
    if (arg.includes('|')) {
      const parts = arg.split('|');
      message = parts[0].trim();
      whenPhrase = parts[1].trim();
    } else {
      const parts = arg.split(' ');
      if (parts.length >= 2) {
        whenPhrase = parts[parts.length - 1];
        message = parts.slice(0, -1).join(' ');
      } else {
        return ctx.reply('Could not parse arguments. Please use `|` to separate details and date.', { parse_mode: 'Markdown' });
      }
    }

    const scheduledFor = parseSnoozePhrase(whenPhrase);
    if (!scheduledFor) {
      return ctx.reply(`❌ Could not parse date/time offset: \`${whenPhrase}\``, { parse_mode: 'Markdown' });
    }

    await prisma.notification.create({
      data: {
        userId,
        title: 'Reminder from Telegram',
        message,
        scheduledFor,
        channels: ['telegram', 'in_app'],
      },
    });

    ctx.reply(`⏰ **Reminder scheduled!**\n- **Msg:** ${message}\n- **Time:** ${scheduledFor.toLocaleString()}`, { parse_mode: 'Markdown' });
  });

  // Daily digest briefing request
  bot.command('digest', async (ctx) => {
    const userId = await getUserIdByChatId(ctx.chat.id);
    if (!userId) return ctx.reply('❌ Account not paired.');

    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      orderBy: { priority: 'desc' },
      take: 5,
    });

    const now = new Date();
    const reminders = await prisma.notification.findMany({
      where: { userId, status: 'PENDING', scheduledFor: { gte: now } },
      orderBy: { scheduledFor: 'asc' },
      take: 5,
    });

    let digestText = `☀️ **MindSpace Briefing:**\n\n📋 **PENDING TASKS:**\n`;
    if (tasks.length === 0) {
      digestText += `  No active tasks.\n`;
    } else {
      tasks.forEach(t => {
        digestText += `  - ${t.title} [${t.priority}]\n`;
      });
    }

    digestText += `\n⏰ **UPCOMING REMINDERS:**\n`;
    if (reminders.length === 0) {
      digestText += `  No active reminders.\n`;
    } else {
      reminders.forEach(r => {
        digestText += `  - ${r.title} on ${new Date(r.scheduledFor).toLocaleString()}\n`;
      });
    }

    ctx.reply(digestText);
  });

  // Conversational Task creation (/add)
  bot.command('add', async (ctx) => {
    const userId = await getUserIdByChatId(ctx.chat.id);
    if (!userId) return ctx.reply('❌ Account not paired.');

    const initialTitle = ctx.match?.trim();
    const sessionKey = `tg:session:${ctx.chat.id}`;

    if (initialTitle) {
      await redis.setex(sessionKey, 300, JSON.stringify({ userId, title: initialTitle, step: 'WAITING_DUE' }));
      return ctx.reply(`📅 **Task title set to:** "${initialTitle}"\n\nEnter due date (e.g. tomorrow, 1h, next week, or type 'skip'):`);
    }

    await redis.setex(sessionKey, 300, JSON.stringify({ userId, step: 'WAITING_TITLE' }));
    ctx.reply('📋 **Conversational task builder started.**\nPlease enter the task title:');
  });

  // Message Handler for Conversational flow state machine
  bot.on('message:text', async (ctx) => {
    const sessionKey = `tg:session:${ctx.chat.id}`;
    const sessionDataStr = await redis.get(sessionKey);
    if (!sessionDataStr) return; // ignore standard messages if no session active

    const session = JSON.parse(sessionDataStr);
    const text = ctx.message.text.trim();

    if (session.step === 'WAITING_TITLE') {
      session.title = text;
      session.step = 'WAITING_DUE';
      await redis.setex(sessionKey, 300, JSON.stringify(session));
      return ctx.reply(`📅 **Task title set to:** "${text}"\n\nEnter due date (e.g. tomorrow, 1h, next week, or type 'skip'):`);
    }

    if (session.step === 'WAITING_DUE') {
      const isSkip = text.toLowerCase() === 'skip';
      const dueAt = isSkip ? null : parseSnoozePhrase(text);
      
      if (!isSkip && !dueAt) {
        return ctx.reply('❌ Could not parse date format. Please try again or type "skip":');
      }

      session.dueAt = dueAt ? dueAt.toISOString() : null;
      session.step = 'WAITING_PRIORITY';
      await redis.setex(sessionKey, 300, JSON.stringify(session));
      return ctx.reply(`🎯 **Select Priority:**\nType LOW, MEDIUM, HIGH, or CRITICAL:`);
    }

    if (session.step === 'WAITING_PRIORITY') {
      const prio = text.toUpperCase();
      const validPrios = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (!validPrios.includes(prio)) {
        return ctx.reply('❌ Invalid priority. Please type LOW, MEDIUM, HIGH, or CRITICAL:');
      }

      // Create task in DB
      const task = await prisma.task.create({
        data: {
          userId: session.userId,
          title: session.title,
          dueAt: session.dueAt ? new Date(session.dueAt) : null,
          priority: prio as any,
          status: 'TODO',
        }
      });

      // Clear session
      await redis.del(sessionKey);

      // Sync Client
      await redis.publish('socket-emit', JSON.stringify({
        room: `user:${session.userId}`,
        event: 'task:updated',
        data: task,
      }));

      return ctx.reply(
        `✅ **Task successfully created!**\n\n` +
        `- **Title:** ${task.title}\n` +
        `- **Priority:** \`[${task.priority}]\`\n` +
        `- **Due:** ${task.dueAt ? task.dueAt.toLocaleString() : 'No deadline'}`
      );
    }
  });

  nextBotCallback = webhookCallback(bot, 'next-js');
  return nextBotCallback;
}

export async function POST(req: Request) {
  try {
    if (isDbDisabled()) {
      return new Response('Service Unavailable', { status: 503 });
    }

    const handler = await getBotCallbackHandler();
    return await handler(req);
  } catch (error) {
    console.error('[Telegram Webhook Error]:', error);
    return new Response(`Error: ${(error as Error).message}`, { status: 500 });
  }
}
