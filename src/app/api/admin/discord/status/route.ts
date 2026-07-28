import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getSystemSetting } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const botToken = await getSystemSetting('DISCORD_BOT_TOKEN');
    const clientId = await getSystemSetting('DISCORD_CLIENT_ID');
    const botStatusText = await getSystemSetting('DISCORD_BOT_STATUS') || 'Listening to /remind';

    if (!botToken) {
      return NextResponse.json({
        status: 'OFFLINE',
        error: 'DISCORD_BOT_TOKEN is not configured.',
      });
    }

    // Call Discord API to fetch bot profile metadata
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      next: { revalidate: 0 },
    });

    if (!userRes.ok) {
      return NextResponse.json({
        status: 'OFFLINE',
        error: `Discord API returned status ${userRes.status}. Token might be invalid or expired.`,
      });
    }

    const botData = await userRes.json();
    
    // Fetch server count (guilds)
    let serverCount = 0;
    try {
      const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        next: { revalidate: 0 },
      });
      if (guildsRes.ok) {
        const guilds = await guildsRes.json();
        serverCount = Array.isArray(guilds) ? guilds.length : 0;
      }
    } catch (gErr) {
      console.warn('[Discord Status guilds fetch warning]:', gErr);
    }

    const avatarUrl = botData.avatar
      ? `https://cdn.discordapp.com/avatars/${botData.id}/${botData.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    return NextResponse.json({
      status: 'ONLINE',
      bot: {
        id: botData.id,
        username: botData.username,
        discriminator: botData.discriminator,
        tag: botData.discriminator !== '0' ? `${botData.username}#${botData.discriminator}` : botData.username,
        avatarUrl,
        serverCount,
        clientId: clientId || botData.id,
        botStatusText,
      },
    });
  } catch (error) {
    console.error('[API /admin/discord/status Error]:', error);
    return NextResponse.json({
      status: 'OFFLINE',
      error: (error as Error).message,
    });
  }
}
