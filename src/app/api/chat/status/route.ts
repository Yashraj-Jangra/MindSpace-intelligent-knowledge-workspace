import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve the list of active online user IDs from Redis set
    let onlineUsers: string[] = [];
    try {
      onlineUsers = await redis.smembers('online_users');
    } catch (err) {
      console.warn('[Redis Online Query Error]:', err);
    }

    return NextResponse.json({ onlineUsers });
  } catch (error) {
    console.error('[API /chat/status GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
