import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getAllSystemSettings, setSystemSetting } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const settings = await getAllSystemSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[API /admin/settings GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { settings } = await req.json();
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings object' }, { status: 400 });
    }

    for (const [key, val] of Object.entries(settings)) {
      await setSystemSetting(key, String(val));
    }

    const updated = await getAllSystemSettings();
    return NextResponse.json({ settings: updated, message: 'Settings saved successfully.' });
  } catch (error) {
    console.error('[API /admin/settings POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
