import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import Redis from 'ioredis';

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

  // Redis Subscriber Client for inter-process communication
  const subClient = new Redis(redisUrl);
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
        console.log(`[Socket.io Redis Sub] Broadcasting event "${event}" to room "${room}"`);
        io.to(room).emit(event, data);
      } catch (e) {
        console.error('[Socket.io Redis Sub] Error processing message:', e);
      }
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('join-room', (roomName) => {
      console.log(`[Socket.io] Client ${socket.id} joining room: ${roomName}`);
      socket.join(roomName);
    });

    socket.on('leave-room', (roomName) => {
      console.log(`[Socket.io] Client ${socket.id} leaving room: ${roomName}`);
      socket.leave(roomName);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
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
