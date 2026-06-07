import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/auth-storage';
import { createSessionToken, setSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find User by email
    const user = await findUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password with bcryptjs
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

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
    console.error('[API /auth/login Error]:', error);
    return NextResponse.json(
      { error: 'Login failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
