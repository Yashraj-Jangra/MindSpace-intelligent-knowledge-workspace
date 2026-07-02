import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';

export interface StoredNote {
  id: string;
  userId: string;
  canvasId?: string | null;
  title: string;
  content: string;
  tags: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isPinned: boolean;
  isArchived: boolean;
  reminderAt?: string | null;
  drawingData?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getLocalNotes(): StoredNote[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(NOTES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveLocalNote(note: StoredNote) {
  try {
    ensureDataDir();
    const notes = getLocalNotes();
    const existingIdx = notes.findIndex((n) => n.id === note.id);
    if (existingIdx >= 0) {
      notes[existingIdx] = note;
    } else {
      notes.unshift(note);
    }
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local Note Store Error]:', error);
  }
}

function deleteLocalNote(id: string) {
  try {
    ensureDataDir();
    const notes = getLocalNotes().filter((n) => n.id !== id);
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local Note Store Delete Error]:', error);
  }
}

export async function getUserNotes(userId: string, search = '', tag = ''): Promise<StoredNote[]> {
  if (!isDbDisabled()) {
    try {
      const dbNotes = await (prisma as any).note.findMany({
        where: {
          userId,
          isArchived: false,
          title: search ? { contains: search, mode: 'insensitive' } : undefined,
          tags: tag ? { has: tag } : undefined,
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      });

      if (dbNotes && dbNotes.length > 0) {
        return dbNotes.map((n: any) => ({
          id: n.id,
          userId: n.userId,
          canvasId: n.canvasId,
          title: n.title,
          content: n.content,
          tags: n.tags || [],
          priority: n.priority || 'MEDIUM',
          isPinned: n.isPinned || false,
          isArchived: n.isArchived || false,
          reminderAt: n.reminderAt ? n.reminderAt.toISOString() : null,
          drawingData: n.drawingData || null,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        }));
      }
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  let localNotes = getLocalNotes().filter((n) => n.userId === userId && !n.isArchived);

  if (search) {
    const query = search.toLowerCase();
    localNotes = localNotes.filter(
      (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
  }

  if (tag) {
    localNotes = localNotes.filter((n) => n.tags.includes(tag));
  }

  return localNotes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getNoteById(id: string): Promise<StoredNote | null> {
  if (!isDbDisabled()) {
    try {
      const n = await (prisma as any).note.findUnique({ where: { id } });
      if (n) {
        return {
          id: n.id,
          userId: n.userId,
          canvasId: n.canvasId,
          title: n.title,
          content: n.content,
          tags: n.tags || [],
          priority: n.priority || 'MEDIUM',
          isPinned: n.isPinned || false,
          isArchived: n.isArchived || false,
          reminderAt: n.reminderAt ? n.reminderAt.toISOString() : null,
          drawingData: n.drawingData || null,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  const localNotes = getLocalNotes();
  return localNotes.find((n) => n.id === id) || null;
}

export async function createNote(data: {
  userId: string;
  title: string;
  content: string;
  tags?: string[];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  reminderAt?: string | null;
  canvasId?: string | null;
}): Promise<StoredNote> {
  const id = `note_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();

  const newNote: StoredNote = {
    id,
    userId: data.userId,
    canvasId: data.canvasId || null,
    title: data.title || 'Untitled Note',
    content: data.content || '',
    tags: data.tags || [],
    priority: data.priority || 'MEDIUM',
    isPinned: false,
    isArchived: false,
    reminderAt: data.reminderAt || null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const dbNote = await (prisma as any).note.create({
      data: {
        id,
        userId: data.userId,
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags,
        priority: newNote.priority,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        canvasId: data.canvasId,
      },
    });
    newNote.id = dbNote.id;
  } catch (error) {
    console.warn('[DB Fallback]: Saving note to local persistent JSON store.', (error as Error).message);
  }

  saveLocalNote(newNote);
  return newNote;
}

export async function updateNote(
  id: string,
  updates: Partial<{
    title: string;
    content: string;
    tags: string[];
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    isPinned: boolean;
    isArchived: boolean;
    reminderAt: string | null;
    canvasId: string | null;
  }>
): Promise<StoredNote | null> {
  const existing = await getNoteById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedNote: StoredNote = {
    ...existing,
    ...updates,
    updatedAt: now,
  };

  try {
    await (prisma as any).note.update({
      where: { id },
      data: {
        title: updates.title,
        content: updates.content,
        tags: updates.tags,
        priority: updates.priority,
        isPinned: updates.isPinned,
        isArchived: updates.isArchived,
        reminderAt: updates.reminderAt !== undefined ? (updates.reminderAt ? new Date(updates.reminderAt) : null) : undefined,
        canvasId: updates.canvasId,
      },
    });
  } catch (error) {
    console.warn('[DB Fallback]: Updating note in local persistent JSON store.');
  }

  saveLocalNote(updatedNote);
  return updatedNote;
}

export async function removeNote(id: string): Promise<boolean> {
  try {
    await (prisma as any).note.delete({ where: { id } });
  } catch (error) {
    // Fallback
  }
  deleteLocalNote(id);
  return true;
}
