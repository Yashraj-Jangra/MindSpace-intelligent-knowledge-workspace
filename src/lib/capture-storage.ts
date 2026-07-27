import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';

export interface StoredCapture {
  id: string;
  userId: string;
  rawText: string;
  sourceUrl?: string | null;
  status: 'PENDING' | 'PROCESSED' | 'DISCARDED';
  canvasId?: string | null;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const CAPTURES_FILE = path.join(DATA_DIR, 'captures.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CAPTURES_FILE)) {
    fs.writeFileSync(CAPTURES_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getLocalCaptures(): StoredCapture[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(CAPTURES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveLocalCapture(capture: StoredCapture) {
  try {
    ensureDataDir();
    const captures = getLocalCaptures();
    const existingIdx = captures.findIndex((c) => c.id === capture.id);
    if (existingIdx >= 0) {
      captures[existingIdx] = capture;
    } else {
      captures.unshift(capture);
    }
    fs.writeFileSync(CAPTURES_FILE, JSON.stringify(captures, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local Capture Store Error]:', error);
  }
}

export async function getUserCaptures(userId: string): Promise<StoredCapture[]> {
  if (!isDbDisabled()) {
    try {
      const dbCaptures = await prisma.capture.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return dbCaptures.map((c) => ({
        id: c.id,
        userId: c.userId,
        rawText: c.rawText,
        sourceUrl: c.sourceUrl,
        status: c.status as any,
        canvasId: c.canvasId,
        createdAt: c.createdAt.toISOString(),
      }));
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  return getLocalCaptures()
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}

export async function createCapture(data: {
  userId: string;
  rawText: string;
  sourceUrl?: string | null;
}): Promise<StoredCapture> {
  const id = `cap_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();

  const newCapture: StoredCapture = {
    id,
    userId: data.userId,
    rawText: data.rawText,
    sourceUrl: data.sourceUrl || null,
    status: 'PENDING',
    canvasId: null,
    createdAt: now,
  };

  if (!isDbDisabled()) {
    try {
      const dbCapture = await prisma.capture.create({
        data: {
          id,
          userId: data.userId,
          rawText: data.rawText,
          sourceUrl: data.sourceUrl,
          status: 'PENDING',
        },
      });
      newCapture.id = dbCapture.id;
    } catch (error) {
      console.warn('[DB Fallback]: Creating capture in local JSON store.', (error as Error).message);
      disableDbCircuitBreaker();
    }
  }

  saveLocalCapture(newCapture);
  return newCapture;
}

export async function updateCaptureStatus(
  id: string,
  status: 'PENDING' | 'PROCESSED' | 'DISCARDED',
  canvasId?: string | null
): Promise<StoredCapture | null> {
  if (!isDbDisabled()) {
    try {
      const dbCapture = await prisma.capture.update({
        where: { id },
        data: {
          status,
          canvasId: canvasId !== undefined ? canvasId : undefined,
        },
      });
      return {
        id: dbCapture.id,
        userId: dbCapture.userId,
        rawText: dbCapture.rawText,
        sourceUrl: dbCapture.sourceUrl,
        status: dbCapture.status as any,
        canvasId: dbCapture.canvasId,
        createdAt: dbCapture.createdAt.toISOString(),
      };
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  const captures = getLocalCaptures();
  const existingIdx = captures.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    const updated = {
      ...captures[existingIdx],
      status,
      canvasId: canvasId !== undefined ? canvasId : captures[existingIdx].canvasId,
    };
    captures[existingIdx] = updated;
    fs.writeFileSync(CAPTURES_FILE, JSON.stringify(captures, null, 2), 'utf-8');
    return updated;
  }

  return null;
}
