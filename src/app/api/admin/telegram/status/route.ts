import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getSystemSetting } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const botToken = await getSystemSetting('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      return NextResponse.json({
        status: 'OFFLINE',
        error: 'TELEGRAM_BOT_TOKEN is not configured.',
      });
    }

    // Query Telegram Bot API to fetch metadata
    const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      next: { revalidate: 0 },
    });

    if (!botRes.ok) {
      return NextResponse.json({
        status: 'OFFLINE',
        error: `Telegram API returned status ${botRes.status}. Token might be invalid or expired.`,
      });
    }

    const resData = await botRes.json();
    if (!resData.ok) {
      return NextResponse.json({
        status: 'OFFLINE',
        error: resData.description || 'Failed to authenticate Telegram token.',
      });
    }

    return NextResponse.json({
      status: 'ONLINE',
      bot: {
        id: resData.result.id,
        firstName: resData.result.first_name,
        username: resData.result.username,
        canJoinGroups: resData.result.can_join_groups,
        supportsInlineQueries: resData.result.supports_inline_queries,
      },
    });
  } catch (error) {
    console.error('[Telegram Status Endpoint Error]:', error);
    return NextResponse.json({
      status: 'OFFLINE',
      error: (error as Error).message,
    }, { status: 500 });
  }
}
