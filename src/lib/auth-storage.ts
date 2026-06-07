import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { UserRole } from '@prisma/client';

export interface StoredUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash?: string | null;
  role: 'USER' | 'ADMIN';
  image?: string | null;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getLocalUsers(): StoredUser[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveLocalUser(user: StoredUser) {
  try {
    ensureDataDir();
    const users = getLocalUsers();
    const existingIdx = users.findIndex((u) => u.email === user.email);
    if (existingIdx >= 0) {
      users[existingIdx] = user;
    } else {
      users.push(user);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local Store Error]:', error);
  }
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role as 'USER' | 'ADMIN',
        image: user.image,
        createdAt: user.createdAt.toISOString(),
      };
    }
  } catch (error) {
    // Database connection fallback
  }

  const localUsers = getLocalUsers();
  return localUsers.find((u) => u.email === normalizedEmail) || null;
}

export async function createUser(data: {
  email: string;
  name?: string;
  passwordHash?: string;
  role?: 'USER' | 'ADMIN';
  image?: string;
}): Promise<StoredUser> {
  const normalizedEmail = data.email.toLowerCase().trim();
  const id = `usr_${Math.random().toString(36).slice(2, 10)}`;
  const role = data.role || 'USER';

  const newUser: StoredUser = {
    id,
    email: normalizedEmail,
    name: data.name || normalizedEmail.split('@')[0],
    passwordHash: data.passwordHash || null,
    role,
    image: data.image || null,
    createdAt: new Date().toISOString(),
  };

  try {
    const dbUser = await prisma.user.create({
      data: {
        id,
        email: normalizedEmail,
        name: newUser.name,
        passwordHash: data.passwordHash,
        role: role as UserRole,
        image: data.image,
      },
    });
    newUser.id = dbUser.id;
  } catch (error) {
    console.warn('[DB Fallback]: Persisting user to local fallback store.', (error as Error).message);
  }

  saveLocalUser(newUser);
  return newUser;
}

export async function countUsers(): Promise<number> {
  try {
    return await prisma.user.count();
  } catch (error) {
    return getLocalUsers().length;
  }
}
