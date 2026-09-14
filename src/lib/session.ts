import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getUserById } from './auth-storage';

const JWT_SECRET = process.env.BETTER_AUTH_SECRET || 'mindspace_local_dev_key';
const COOKIE_NAME = 'mindspace_session';

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
  image?: string | null;
}

export function createSessionToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function getSessionFromCookie(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const decoded = verifySessionToken(token);
    if (!decoded) return null;

    // Fetch fresh user data from DB/local store to prevent stale role values in JWT token
    const freshUser = await getUserById(decoded.id);
    if (!freshUser) {
      return decoded;
    }

    return {
      id: freshUser.id,
      email: freshUser.email,
      name: freshUser.name,
      role: freshUser.role,
      image: freshUser.image,
    };
  } catch (error) {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
