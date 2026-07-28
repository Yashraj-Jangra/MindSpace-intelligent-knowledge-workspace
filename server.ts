import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { Client as DiscordClient, GatewayIntentBits, ActivityType } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { Bot as TelegramBot } from 'grammy';

const prisma = new PrismaClient();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, { lazyConnect: true });
redis.on('error', (err) => {
  console.error('[Redis Client Error]:', err.message);
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Persistent Discord Bot Gateway Client
  let discordClient: DiscordClient | null = null;

  async function startDiscordBot() {
    try {
      const settingToken = await prisma.systemSetting.findUnique({
        where: { key: 'DISCORD_BOT_TOKEN' }
      });
      const botToken = settingToken?.value;

      const settingStatus = await prisma.systemSetting.findUnique({
        where: { key: 'DISCORD_BOT_STATUS' }
      });
      const statusText = settingStatus?.value || 'Listening to /remind';

      if (!botToken) {
        console.log('[Discord Bot Manager] No bot token configured. Waiting...');
        if (discordClient) {
          await discordClient.destroy();
          discordClient = null;
        }
        return;
      }

      if (discordClient) {
        console.log('[Discord Bot Manager] Hot-reloading bot client...');
        await discordClient.destroy();
        discordClient = null;
      }

      console.log('[Discord Bot Manager] Attempting persistent login to Gateway...');
      discordClient = new DiscordClient({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
      });

      discordClient.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

        let optionsPayload: any = undefined;
        if (interaction.isChatInputCommand()) {
          optionsPayload = interaction.options.data.map(opt => ({
            name: opt.name,
            type: opt.type,
            value: opt.value,
            options: opt.options?.map(subOpt => ({
              name: subOpt.name,
              type: subOpt.type,
              value: subOpt.value,
            }))
          }));
        }

        let customIdPayload: string | undefined = undefined;
        let valuesPayload: string[] | undefined = undefined;
        if (interaction.isButton()) {
          customIdPayload = interaction.customId;
        } else if (interaction.isStringSelectMenu()) {
          customIdPayload = interaction.customId;
          valuesPayload = interaction.values;
        }

        const payload = {
          type: interaction.isChatInputCommand() ? 2 : 3,
          id: interaction.id,
          token: interaction.token,
          application_id: interaction.applicationId,
          guild_id: interaction.guildId,
          channel_id: interaction.channelId,
          user: {
            id: interaction.user.id,
            username: interaction.user.username,
            avatar: interaction.user.avatar,
            discriminator: interaction.user.discriminator,
          },
          member: interaction.member ? {
            user: {
              id: interaction.user.id,
              username: interaction.user.username,
              avatar: interaction.user.avatar,
              discriminator: interaction.user.discriminator,
            }
          } : undefined,
          data: {
            id: interaction.isChatInputCommand() ? interaction.commandId : undefined,
            name: interaction.isChatInputCommand() ? interaction.commandName : undefined,
            custom_id: customIdPayload,
            component_type: interaction.isButton() ? 2 : interaction.isStringSelectMenu() ? 3 : undefined,
            values: valuesPayload,
            type: interaction.isChatInputCommand() ? 1 : undefined,
            options: optionsPayload,
          }
        };

        try {
          await interaction.deferReply({ ephemeral: true });

          const response = await fetch(`http://localhost:${port}/api/discord/bot`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-local-bypass': 'true',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json();
            if (result?.data?.content) {
              await interaction.editReply(result.data.content);
            } else {
              await interaction.editReply('Command processed successfully.');
            }
          } else {
            const errText = await response.text();
            await interaction.editReply(`❌ Failed to process command on local server: ${errText || 'Internal error'}`);
          }
        } catch (err) {
          console.error('[Discord Bot Gateway Interaction Error]:', err);
          try {
            await interaction.editReply('❌ Local server connection error or processing timeout.');
          } catch (e) {}
        }
      });

      discordClient.once('ready', () => {
        console.log(`[Discord Bot Manager] Persistent bot ONLINE: ${discordClient?.user?.tag}`);
        discordClient?.user?.setPresence({
          activities: [{ name: statusText, type: ActivityType.Custom }],
          status: 'online',
        });
      });

      await discordClient.login(botToken);
    } catch (err) {
      console.error('[Discord Bot Manager] Persistent connection failed:', (err as Error).message);
    }
  }

  // Persistent Telegram Bot client reference
  let telegramBot: TelegramBot | null = null;

  async function startTelegramBot() {
    try {
      const settingToken = await prisma.systemSetting.findUnique({
        where: { key: 'TELEGRAM_BOT_TOKEN' }
      });
      const botToken = settingToken?.value;

      if (!botToken) {
        console.log('[Telegram Bot Manager] No bot token configured. Waiting...');
        if (telegramBot) {
          await telegramBot.stop();
          telegramBot = null;
        }
        return;
      }

      if (telegramBot) {
        console.log('[Telegram Bot Manager] Hot-reloading bot client...');
        await telegramBot.stop();
        telegramBot = null;
      }

      console.log('[Telegram Bot Manager] Attempting persistent login via Long Polling...');
      telegramBot = new TelegramBot(botToken);

      // Onboarding
      telegramBot.command('start', (ctx) => {
        ctx.reply(
          `👋 **Welcome to MindSpace Bot Companion!**\n\n` +
          `This bot acts as a remote control for your visual note-taking canvas and tasks.\n\n` +
          `**How to pair:**\n` +
          `1. Open the MindSpace Web UI\n` +
          `2. Open the Settings Drawer (click your profile image)\n` +
          `3. Go to the **Telegram** tab and copy your pairing code\n` +
          `4. Send here: \`/pair <pairing_code>\``,
          { parse_mode: 'Markdown' }
        );
      });

      async function getUserIdByChatId(chatId: number) {
        const acc = await prisma.telegramAccount.findFirst({
          where: { telegramChatId: chatId.toString(), isPaired: true }
        });
        return acc?.userId || null;
      }

      telegramBot.command('pair', async (ctx) => {
        const code = ctx.match?.trim();
        if (!code) {
          return ctx.reply('Please specify a pairing code, e.g. `/pair 123456`', { parse_mode: 'Markdown' });
        }
        try {
          const { pairTelegramAccount } = require('./src/lib/telegram/bot');
          const account = await pairTelegramAccount(code, ctx.chat.id.toString(), ctx.from?.username);
          ctx.reply(`✅ **Account successfully paired!**\nWelcome to MindSpace, ${account.username || 'user'}!`, { parse_mode: 'Markdown' });
        } catch (err) {
          ctx.reply(`❌ **Pairing failed:** ${(err as Error).message}`, { parse_mode: 'Markdown' });
        }
      });

      telegramBot.command('tasks', async (ctx) => {
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

      telegramBot.command('done', async (ctx) => {
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

      telegramBot.command('capture', async (ctx) => {
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

      telegramBot.command('remind', async (ctx) => {
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

        const { parseSnoozePhrase } = require('./src/lib/snooze-parser');
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

      telegramBot.command('digest', async (ctx) => {
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

      telegramBot.command('add', async (ctx) => {
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

      telegramBot.on('message:text', async (ctx) => {
        const sessionKey = `tg:session:${ctx.chat.id}`;
        const sessionDataStr = await redis.get(sessionKey);
        if (!sessionDataStr) return;

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
          const { parseSnoozePhrase } = require('./src/lib/snooze-parser');
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

          const task = await prisma.task.create({
            data: {
              userId: session.userId,
              title: session.title,
              dueAt: session.dueAt ? new Date(session.dueAt) : null,
              priority: prio as any,
              status: 'TODO',
            }
          });

          await redis.del(sessionKey);

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

      telegramBot.catch((err) => {
        console.error('[Telegram Bot Error Handler]:', err);
      });

      telegramBot.start();

      telegramBot.api.getMe().then((me) => {
        console.log(`[Telegram Bot Manager] Bot logged in and ONLINE as @${me.username}`);
      }).catch((e) => {
        console.error('[Telegram Bot Manager] Failed to load metadata:', e.message);
      });

    } catch (err) {
      console.error('[Telegram Bot Manager] Long polling start failed:', (err as Error).message);
    }
  }

  // Launch bots on server startup
  startDiscordBot();
  startTelegramBot();

  // Redis Subscriber Client for inter-process communication
  const subClient = new Redis(redisUrl, { lazyConnect: true });
  subClient.on('error', (err) => {
    console.error('[Socket.io Redis Sub Error]:', err.message);
  });

  subClient.subscribe('socket-emit', (err) => {
    if (err) {
      console.error('[Socket.io Redis Sub] Failed to subscribe to socket-emit:', err);
    } else {
      console.log('[Socket.io Redis Sub] Subscribed to socket-emit channel.');
    }
  });

  subClient.on('message', (channel, message) => {
    if (channel === 'socket-emit') {
      try {
        const { room, event, data } = JSON.parse(message);
        if (event === 'settings:updated') {
          console.log('[Socket.io Redis Sub] Settings updated. Re-initiating Discord & Telegram Bot Gateways...');
          startDiscordBot();
          startTelegramBot();
        }
        io.to(room).emit(event, data);
      } catch (e) {
        console.error('[Socket.io Redis Sub] Error processing message:', e);
      }
    }
  });

  const pubClient = new Redis(redisUrl, { lazyConnect: true });
  pubClient.on('error', (err) => {
    console.error('[Socket.io Redis Pub Error]:', err.message);
  });

  const socketToUser = new Map<string, string>();

  io.on('connection', (socket) => {
    socket.on('user:online', async (userId) => {
      socketToUser.set(socket.id, userId);
      try {
        await pubClient.sadd('online_users', userId);
        io.emit('user:online', { userId });
      } catch (err) {
        console.error('Failed to register user online in Redis:', err);
      }
    });

    socket.on('join-room', (roomName) => {
      socket.join(roomName);
    });

    socket.on('leave-room', (roomName) => {
      socket.leave(roomName);
    });

    // Canvas Co-Presence Multiplayer Events
    socket.on('cursor:move', (data) => {
      if (data?.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('cursor:move', {
          socketId: socket.id,
          user: data.user,
          x: data.x,
          y: data.y,
        });
      }
    });

    socket.on('node:moved', (data) => {
      if (data?.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('node:moved', data);
      }
    });

    socket.on('node:updated', (data) => {
      if (data?.canvasId) {
        socket.to(`canvas:${data.canvasId}`).emit('node:updated', data);
      }
    });

    socket.on('disconnect', async () => {
      const userId = socketToUser.get(socket.id);
      if (userId) {
        socketToUser.delete(socket.id);
        const sockets = await io.fetchSockets();
        let stillConnected = false;
        for (const s of sockets) {
          if (socketToUser.get(s.id) === userId) {
            stillConnected = true;
            break;
          }
        }
        if (!stillConnected) {
          try {
            await pubClient.srem('online_users', userId);
            io.emit('user:offline', { userId });
          } catch (err) {
            console.error('Failed to remove user from online users in Redis:', err);
          }
        }
      }
      io.emit('cursor:left', { socketId: socket.id });
    });
  });

  (global as any).io = io;

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('[Next.js custom server init error]:', err);
  process.exit(1);
});
