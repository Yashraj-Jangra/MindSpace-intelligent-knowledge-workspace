import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const canvasId = searchParams.get('canvasId');

    if (!canvasId) {
      return NextResponse.json({ error: 'canvasId parameter is required' }, { status: 400 });
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
    const { canvasId, label, markdown, type = 'CONCEPT', color = '#FF3D00', parentId, reminderAt, userId = 'default_user' } = await req.json();

    if (!canvasId || !label) {
      return NextResponse.json({ error: 'canvasId and label are required' }, { status: 400 });
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

    await dispatchWebhookEvent(userId, 'node.created', {
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
