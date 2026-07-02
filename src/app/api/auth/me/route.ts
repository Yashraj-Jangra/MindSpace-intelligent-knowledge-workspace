import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';

const DEFAULT_DEV_USER = {
  id: 'usr_demo',
  email: 'demo@mindspace.local',
  name: 'Demo User',
  role: 'USER' as const,
};

export async function GET() {
  try {
    const user = await getSessionFromCookie();

    return NextResponse.json({
      authenticated: true,
      user: user || DEFAULT_DEV_USER,
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: true,
      user: DEFAULT_DEV_USER,
    });
  }
}
