import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const canvasId = searchParams.get('canvasId');

    if (!canvasId) {
      return NextResponse.json({ error: 'canvasId parameter is required' }, { status: 400 });
    }

    const canvas = await prisma.canvas.findUnique({
      where: { id: canvasId },
    });

    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    if (canvas.userId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nodes = await prisma.node.findMany({
      where: { canvasId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ nodes });
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

    const { canvasId, label, markdown, type = 'CONCEPT', color = '#FF3D00', parentId, reminderAt } = await req.json();

    if (!canvasId || !label) {
      return NextResponse.json({ error: 'canvasId and label are required' }, { status: 400 });
    }

    const canvas = await prisma.canvas.findUnique({
      where: { id: canvasId },
    });

    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    if (canvas.userId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const node = await prisma.node.create({
      data: {
        canvasId,
        label,
        markdown: markdown || '',
        type,
        color,
        parentId,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
      },
    });

    await dispatchWebhookEvent(session.id, 'node.created', {
      canvasId,
      nodeId: node.id,
      label: node.label,
      source: 'public_rest_api',
    });

    return NextResponse.json({ node });
  } catch (error) {
    console.error('[Public REST API /api/v1/nodes Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
