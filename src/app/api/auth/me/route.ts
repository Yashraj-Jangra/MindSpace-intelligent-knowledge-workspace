import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSessionFromCookie();

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
