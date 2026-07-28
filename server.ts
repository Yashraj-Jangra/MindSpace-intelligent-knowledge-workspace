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
        io.to(room).emit(event, data);
      } catch (e) {
        console.error('[Socket.io Redis Sub] Error processing message:', e);
      }
    }
  });

  io.on('connection', (socket) => {
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

    socket.on('disconnect', () => {
      // Notify canvas rooms that cursor left
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
