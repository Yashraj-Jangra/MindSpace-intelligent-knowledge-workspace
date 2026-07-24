import { NextResponse } from 'next/server';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    if (!isDbDisabled()) {
      try {
        const webhooks = await prisma.webhook.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ webhooks });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    return NextResponse.json({ webhooks: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const { name, targetUrl, events, secret } = await req.json();

    if (!targetUrl) {
      return NextResponse.json({ error: 'targetUrl is required' }, { status: 400 });
    }

    if (!isDbDisabled()) {
      try {
        const webhook = await prisma.webhook.create({
          data: {
            userId,
            name: name || 'Custom Webhook',
            targetUrl,
            secret: secret || process.env.WEBHOOK_SECRET_KEY || 'mindspace_secret',
            events: Array.isArray(events) && events.length > 0 ? events : ['node.created', 'reminder.fired', 'canvas.updated'],
            isActive: true,
          },
        });

        return NextResponse.json({ webhook });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    const mockWebhook = {
      id: `wh_${Date.now()}`,
      userId,
      name: name || 'Custom Webhook',
      targetUrl,
      secret: secret || 'mindspace_secret',
      events: events || ['node.created'],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ webhook: mockWebhook });
  } catch (error) {
    console.error('[API /webhooks POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    if (!isDbDisabled()) {
      try {
        await prisma.webhook.delete({
          where: { id, userId: session.id },
        });
        return NextResponse.json({ success: true });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    return NextResponse.json({ success: true, mock: true });
  } catch (error) {
    console.error('[API /webhooks DELETE Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
