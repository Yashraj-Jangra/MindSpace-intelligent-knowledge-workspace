import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { Client as DiscordClient, GatewayIntentBits, ActivityType } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

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

  // Launch bot on server startup
  startDiscordBot();

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
          console.log('[Socket.io Redis Sub] Settings updated. Re-initiating Discord Bot Gateway...');
          startDiscordBot();
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
