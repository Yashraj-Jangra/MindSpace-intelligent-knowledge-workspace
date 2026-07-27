import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';
import { TaskStatus, TaskPriority } from '@prisma/client';

export interface StoredTask {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  isPinned: boolean;
  tags: string[];
  notifyEvery: number | null;
  channels: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: StoredTask[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getLocalTasksRaw(): StoredTask[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(TASKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveLocalTasksRaw(tasks: StoredTask[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local Task Store Save Error]:', error);
  }
}

function mapDbToStoredTask(dbTask: any): StoredTask {
  return {
    id: dbTask.id,
    userId: dbTask.userId,
    parentId: dbTask.parentId,
    title: dbTask.title,
    description: dbTask.description,
    status: dbTask.status,
    priority: dbTask.priority,
    dueAt: dbTask.dueAt ? dbTask.dueAt.toISOString() : null,
    isPinned: dbTask.isPinned,
    tags: dbTask.tags,
    notifyEvery: dbTask.notifyEvery,
    channels: dbTask.channels,
    completedAt: dbTask.completedAt ? dbTask.completedAt.toISOString() : null,
    createdAt: dbTask.createdAt.toISOString(),
    updatedAt: dbTask.updatedAt.toISOString(),
    subtasks: dbTask.subtasks ? dbTask.subtasks.map(mapDbToStoredTask) : [],
  };
}

export async function getUserTasks(userId: string): Promise<StoredTask[]> {
  if (!isDbDisabled()) {
    try {
      const dbTasks = await prisma.task.findMany({
        where: { userId, parentId: null },
        include: {
          subtasks: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return dbTasks.map(mapDbToStoredTask);
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  const allTasks = getLocalTasksRaw().filter((t) => t.userId === userId);
  const macros = allTasks.filter((t) => !t.parentId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return macros.map((macro) => {
    const subtasks = allTasks
      .filter((t) => t.parentId === macro.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { ...macro, subtasks };
  });
}

export async function getTaskById(id: string): Promise<StoredTask | null> {
  if (!isDbDisabled()) {
    try {
      const dbTask = await prisma.task.findUnique({
        where: { id },
        include: {
          subtasks: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (dbTask) return mapDbToStoredTask(dbTask);
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  const allTasks = getLocalTasksRaw();
  const task = allTasks.find((t) => t.id === id);
  if (!task) return null;

  const subtasks = allTasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return { ...task, subtasks };
}

export async function createTask(data: {
  userId: string;
  parentId?: string | null;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: string | null;
  tags?: string[];
  notifyEvery?: number | null;
  channels?: string[];
}): Promise<StoredTask> {
  const id = `task_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();

  const newTask: StoredTask = {
    id,
    userId: data.userId,
    parentId: data.parentId || null,
    title: data.title,
    description: data.description || null,
    status: TaskStatus.TODO,
    priority: data.priority || TaskPriority.MEDIUM,
    dueAt: data.dueAt || null,
    isPinned: false,
    tags: data.tags || [],
    notifyEvery: data.notifyEvery || null,
    channels: data.channels || ['in_app'],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    subtasks: [],
  };

  if (!isDbDisabled()) {
    try {
      const dbTask = await prisma.task.create({
        data: {
          id,
          userId: data.userId,
          parentId: data.parentId || null,
          title: data.title,
          description: data.description,
          status: TaskStatus.TODO,
          priority: newTask.priority,
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
          tags: newTask.tags,
          notifyEvery: newTask.notifyEvery,
          channels: newTask.channels,
        },
      });
      newTask.id = dbTask.id;
    } catch (error) {
      console.warn('[DB Fallback]: Creating task in local JSON store.', (error as Error).message);
      disableDbCircuitBreaker();
    }
  }

  const allTasks = getLocalTasksRaw();
  allTasks.push(newTask);
  saveLocalTasksRaw(allTasks);

  return newTask;
}

export async function updateTask(
  id: string,
  updates: Partial<{
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt: string | null;
    isPinned: boolean;
    tags: string[];
    notifyEvery: number | null;
    channels: string[];
    completedAt: string | null;
  }>
): Promise<StoredTask | null> {
  const existing = await getTaskById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  let finalStatus = updates.status !== undefined ? updates.status : existing.status;
  let finalCompletedAt = existing.completedAt;

  if (updates.status === TaskStatus.DONE && existing.status !== TaskStatus.DONE) {
    finalCompletedAt = now;
  } else if (updates.status !== undefined && updates.status !== TaskStatus.DONE) {
    finalCompletedAt = null;
  }

  const updatedTask: StoredTask = {
    ...existing,
    ...updates,
    status: finalStatus,
    completedAt: finalCompletedAt,
    updatedAt: now,
  };

  if (!isDbDisabled()) {
    try {
      await prisma.task.update({
        where: { id },
        data: {
          title: updates.title,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          dueAt: updates.dueAt ? new Date(updates.dueAt) : (updates.dueAt === null ? null : undefined),
          isPinned: updates.isPinned,
          tags: updates.tags,
          notifyEvery: updates.notifyEvery,
          channels: updates.channels,
          completedAt: finalCompletedAt ? new Date(finalCompletedAt) : null,
        },
      });
    } catch (error) {
      console.warn('[DB Fallback]: Updating task in local JSON store.', (error as Error).message);
      disableDbCircuitBreaker();
    }
  }

  const allTasks = getLocalTasksRaw();
  const idx = allTasks.findIndex((t) => t.id === id);
  if (idx >= 0) {
    const { subtasks, ...flatTask } = updatedTask;
    allTasks[idx] = flatTask as StoredTask;
    saveLocalTasksRaw(allTasks);
  }

  // Auto-complete or revert parent progress if we are a subtask
  if (existing.parentId) {
    await verifyParentProgress(existing.parentId);
  }

  return getTaskById(id);
}

export async function removeTask(id: string): Promise<boolean> {
  const existing = await getTaskById(id);
  if (!existing) return false;

  if (!isDbDisabled()) {
    try {
      // 1. Delete all subtasks first to respect cascade logic
      await prisma.task.deleteMany({ where: { parentId: id } });
      // 2. Delete the parent task
      await prisma.task.delete({ where: { id } });
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  // JSON delete cascaded manually
  const allTasks = getLocalTasksRaw();
  const filtered = allTasks.filter((t) => t.id !== id && t.parentId !== id);
  saveLocalTasksRaw(filtered);

  if (existing.parentId) {
    await verifyParentProgress(existing.parentId);
  }

  return true;
}

export async function completeTask(id: string): Promise<StoredTask | null> {
  return updateTask(id, { status: TaskStatus.DONE });
}

export async function getUserTasksDue(userId: string): Promise<StoredTask[]> {
  if (!isDbDisabled()) {
    try {
      const dbTasks = await prisma.task.findMany({
        where: {
          userId,
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          dueAt: { not: null },
        },
        orderBy: { dueAt: 'asc' },
      });
      return dbTasks.map(mapDbToStoredTask);
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  return getLocalTasksRaw()
    .filter((t) => t.userId === userId && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED && t.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
}

export async function getPinnedTasks(userId: string): Promise<StoredTask[]> {
  if (!isDbDisabled()) {
    try {
      const dbTasks = await prisma.task.findMany({
        where: { userId, isPinned: true },
        orderBy: { updatedAt: 'desc' },
      });
      return dbTasks.map(mapDbToStoredTask);
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  return getLocalTasksRaw()
    .filter((t) => t.userId === userId && t.isPinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Check parent and set status depending on subtask complete count
async function verifyParentProgress(parentId: string) {
  const parent = await getTaskById(parentId);
  if (!parent || !parent.subtasks) return;

  const total = parent.subtasks.length;
  const completed = parent.subtasks.filter((t) => t.status === TaskStatus.DONE).length;

  let targetStatus = parent.status;
  if (total > 0) {
    if (completed === total) {
      targetStatus = TaskStatus.DONE;
    } else if (completed > 0) {
      targetStatus = TaskStatus.IN_PROGRESS;
    } else {
      targetStatus = TaskStatus.TODO;
    }
  }

  if (targetStatus !== parent.status) {
    await updateTask(parentId, { status: targetStatus });
  }
}
