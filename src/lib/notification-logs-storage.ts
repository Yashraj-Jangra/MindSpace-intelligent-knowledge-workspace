import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';

export interface StoredNotificationLog {
  id: string;
  userId: string;
  channel: string;
  target: string;
  title: string;
  body: string | null;
  status: string;
  error: string | null;
  createdAt: string;
  userName?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'notification-logs.json');

function ensureFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify([]), 'utf-8');
  }
}

function readJsonLogs(): StoredNotificationLog[] {
  try {
    ensureFileExists();
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJsonLogs(logs: StoredNotificationLog[]) {
  try {
    ensureFileExists();
    fs.writeFileSync(FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[writeJsonLogs Error]:', err);
  }
}

export async function getNotificationLogs(limit = 100): Promise<StoredNotificationLog[]> {
  if (!isDbDisabled()) {
    try {
      const logs = await prisma.notificationLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true, email: true } } },
      });
      return logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        channel: l.channel,
        target: l.target,
        title: l.title,
        body: l.body,
        status: l.status,
        error: l.error,
        createdAt: l.createdAt.toISOString(),
        userName: l.user.username || l.user.email,
      }));
    } catch (err) {
      console.warn('[Notification Log Storage] DB query failed:', err);
      disableDbCircuitBreaker();
    }
  }

  const logs = readJsonLogs();
  return logs.slice(0, limit);
}

export async function createNotificationLog(data: {
  userId: string;
  channel: string;
  target: string;
  title: string;
  body?: string | null;
  status?: string;
  error?: string | null;
}): Promise<StoredNotificationLog> {
  const status = data.status || 'SENT';

  if (!isDbDisabled()) {
    try {
      const created = await prisma.notificationLog.create({
        data: {
          userId: data.userId,
          channel: data.channel,
          target: data.target,
          title: data.title,
          body: data.body || null,
          status,
          error: data.error || null,
        },
      });
      return {
        id: created.id,
        userId: created.userId,
        channel: created.channel,
        target: created.target,
        title: created.title,
        body: created.body,
        status: created.status,
        error: created.error,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (err) {
      console.warn('[Notification Log Storage] DB create failed:', err);
      disableDbCircuitBreaker();
    }
  }

  const newLog: StoredNotificationLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: data.userId,
    channel: data.channel,
    target: data.target,
    title: data.title,
    body: data.body || null,
    status,
    error: data.error || null,
    createdAt: new Date().toISOString(),
  };

  const logs = readJsonLogs();
  logs.unshift(newLog);
  writeJsonLogs(logs);
  return newLog;
}
