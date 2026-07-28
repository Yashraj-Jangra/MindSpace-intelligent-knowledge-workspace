import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { UserRole } from '@prisma/client';

export interface StoredUser {
  id: string;
  email: string;
  name: string | null;
  username?: string | null;
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
    const index = users.findIndex((u) => u.id === user.id || u.email === user.email);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local User Store Error]:', error);
  }
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        username: dbUser.username,
        passwordHash: dbUser.passwordHash,
        role: dbUser.role as 'USER' | 'ADMIN',
        image: dbUser.image,
        createdAt: dbUser.createdAt.toISOString(),
      };
    }
  } catch (error) {
    console.warn('[DB Fallback]: Querying local fallback store for user.', (error as Error).message);
  }

  const localUsers = getLocalUsers();
  return localUsers.find((u) => u.email.toLowerCase() === normalizedEmail) || null;
}

export const findUserByEmail = getUserByEmail;

export async function getUserById(id: string): Promise<StoredUser | null> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id },
    });
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        username: dbUser.username,
        passwordHash: dbUser.passwordHash,
        role: dbUser.role as 'USER' | 'ADMIN',
        image: dbUser.image,
        createdAt: dbUser.createdAt.toISOString(),
      };
    }
  } catch (error) {
    console.warn('[DB Fallback]: Querying local fallback store for user by ID.', (error as Error).message);
  }

  const localUsers = getLocalUsers();
  return localUsers.find((u) => u.id === id) || null;
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
    username: data.name || normalizedEmail.split('@')[0],
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
        username: newUser.username,
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

export async function getAllUsers(): Promise<StoredUser[]> {
  try {
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return dbUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      username: u.username,
      passwordHash: u.passwordHash,
      role: u.role as 'USER' | 'ADMIN',
      image: u.image,
      createdAt: u.createdAt.toISOString(),
    }));
  } catch (error) {
    return getLocalUsers();
  }
}

export async function countUsers(): Promise<number> {
  try {
    return await prisma.user.count();
  } catch (error) {
    return getLocalUsers().length;
  }
}

export async function updateUserRole(id: string, role: 'USER' | 'ADMIN'): Promise<void> {
  try {
    await prisma.user.update({
      where: { id },
      data: { role },
    });
  } catch (error) {
    console.warn('[DB Fallback]: Updating user role in local store.', (error as Error).message);
  }

  try {
    ensureDataDir();
    const users = getLocalUsers();
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex >= 0) {
      users[userIndex].role = role;
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('[Local User Role Update Error]:', error);
  }
}
