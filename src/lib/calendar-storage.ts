import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';

export type EventRecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface CalendarEventRecord {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  isAllDay: boolean;
  location?: string | null;
  color: string;
  recurrence: EventRecurrenceType;
  sourceType: string;
  sourceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PATH = path.join(DATA_DIR, 'calendar-events.json');

function ensureFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify([]), 'utf-8');
  }
}

function readJsonEvents(): CalendarEventRecord[] {
  try {
    ensureFileExists();
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJsonEvents(events: CalendarEventRecord[]) {
  try {
    ensureFileExists();
    fs.writeFileSync(FILE_PATH, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err) {
    console.error('[writeJsonEvents Error]:', err);
  }
}

export async function getCalendarEvents(userId: string): Promise<CalendarEventRecord[]> {
  if (!isDbDisabled()) {
    try {
      const dbEvents = await prisma.calendarEvent.findMany({
        where: { userId },
        orderBy: { startAt: 'asc' },
      });
      return dbEvents.map((e) => ({
        id: e.id,
        userId: e.userId,
        title: e.title,
        description: e.description,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt ? e.endAt.toISOString() : null,
        isAllDay: e.isAllDay,
        location: e.location,
        color: e.color,
        recurrence: e.recurrence as EventRecurrenceType,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.warn('[Calendar Storage] DB read failed, tripping circuit breaker:', err);
      disableDbCircuitBreaker();
    }
  }

  const all = readJsonEvents();
  return all.filter((e) => e.userId === userId);
}

export async function createCalendarEvent(
  userId: string,
  data: {
    title: string;
    description?: string | null;
    startAt: string;
    endAt?: string | null;
    isAllDay?: boolean;
    location?: string | null;
    color?: string;
    recurrence?: EventRecurrenceType;
    sourceType?: string;
    sourceId?: string | null;
  }
): Promise<CalendarEventRecord> {
  const startAtDate = new Date(data.startAt);
  const endAtDate = data.endAt ? new Date(data.endAt) : null;
  const isAllDay = data.isAllDay ?? false;
  const color = data.color || '#4285F4';
  const recurrence = data.recurrence || 'NONE';
  const sourceType = data.sourceType || 'EVENT';

  if (!isDbDisabled()) {
    try {
      const created = await prisma.calendarEvent.create({
        data: {
          userId,
          title: data.title,
          description: data.description || null,
          startAt: startAtDate,
          endAt: endAtDate,
          isAllDay,
          location: data.location || null,
          color,
          recurrence: recurrence as any,
          sourceType,
          sourceId: data.sourceId || null,
        },
      });

      return {
        id: created.id,
        userId: created.userId,
        title: created.title,
        description: created.description,
        startAt: created.startAt.toISOString(),
        endAt: created.endAt ? created.endAt.toISOString() : null,
        isAllDay: created.isAllDay,
        location: created.location,
        color: created.color,
        recurrence: created.recurrence as EventRecurrenceType,
        sourceType: created.sourceType,
        sourceId: created.sourceId,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      console.warn('[Calendar Storage] DB create failed, falling back to local JSON:', err);
      disableDbCircuitBreaker();
    }
  }

  const newRecord: CalendarEventRecord = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: data.title,
    description: data.description || null,
    startAt: startAtDate.toISOString(),
    endAt: endAtDate ? endAtDate.toISOString() : null,
    isAllDay,
    location: data.location || null,
    color,
    recurrence,
    sourceType,
    sourceId: data.sourceId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const all = readJsonEvents();
  all.push(newRecord);
  writeJsonEvents(all);
  return newRecord;
}

export async function updateCalendarEvent(
  userId: string,
  id: string,
  updates: Partial<CalendarEventRecord>
): Promise<CalendarEventRecord | null> {
  if (!isDbDisabled()) {
    try {
      const updated = await prisma.calendarEvent.update({
        where: { id, userId },
        data: {
          title: updates.title,
          description: updates.description,
          startAt: updates.startAt ? new Date(updates.startAt) : undefined,
          endAt: updates.endAt !== undefined ? (updates.endAt ? new Date(updates.endAt) : null) : undefined,
          isAllDay: updates.isAllDay,
          location: updates.location,
          color: updates.color,
          recurrence: updates.recurrence as any,
          sourceType: updates.sourceType,
          sourceId: updates.sourceId,
        },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        title: updated.title,
        description: updated.description,
        startAt: updated.startAt.toISOString(),
        endAt: updated.endAt ? updated.endAt.toISOString() : null,
        isAllDay: updated.isAllDay,
        location: updated.location,
        color: updated.color,
        recurrence: updated.recurrence as EventRecurrenceType,
        sourceType: updated.sourceType,
        sourceId: updated.sourceId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      console.warn('[Calendar Storage] DB update failed, falling back to JSON:', err);
      disableDbCircuitBreaker();
    }
  }

  const all = readJsonEvents();
  const index = all.findIndex((e) => e.id === id && e.userId === userId);
  if (index === -1) return null;

  const existing = all[index];
  const updatedRecord: CalendarEventRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updatedRecord;
  writeJsonEvents(all);
  return updatedRecord;
}

export async function deleteCalendarEvent(userId: string, id: string): Promise<boolean> {
  if (!isDbDisabled()) {
    try {
      await prisma.calendarEvent.delete({
        where: { id, userId },
      });
      return true;
    } catch (err) {
      console.warn('[Calendar Storage] DB delete failed, falling back to JSON:', err);
      disableDbCircuitBreaker();
    }
  }

  const all = readJsonEvents();
  const filtered = all.filter((e) => !(e.id === id && e.userId === userId));
  if (filtered.length === all.length) return false;

  writeJsonEvents(filtered);
  return true;
}
