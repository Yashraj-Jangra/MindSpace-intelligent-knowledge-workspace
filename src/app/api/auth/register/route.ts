import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail, createUser, countUsers } from '@/lib/auth-storage';
import { createSessionToken, setSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Valid email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password with bcryptjs
    const passwordHash = await bcrypt.hash(password, 10);

    // First user is automatically assigned ADMIN status
    const totalUsers = await countUsers();
    const role = totalUsers === 0 ? 'ADMIN' : 'USER';

    // Create User record
    const user = await createUser({
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      passwordHash,
      role,
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    };

    // Create session JWT token and set HTTP-only cookie
    const token = createSessionToken(sessionUser);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: sessionUser,
    });
  } catch (error) {
    console.error('[API /auth/register Error]:', error);
    return NextResponse.json(
      { error: 'Registration failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
