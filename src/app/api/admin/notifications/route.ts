import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getNotificationLogs } from '@/lib/notification-logs-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const logs = await getNotificationLogs(100);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[API /admin/notifications GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
