import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getCanvasById, updateCanvas, removeCanvas } from '@/lib/canvas-storage';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;
    const { id } = await params;

    const canvas = await getCanvasById(id);
    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    if (canvas.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error('[API /api/canvas/[id] GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;
    const { id } = await params;

    const canvas = await getCanvasById(id);
    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    if (canvas.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    
    const updated = await updateCanvas(id, {
      title: body.title,
      description: body.description,
      isPublic: body.isPublic,
      viewportX: body.viewportX,
      viewportY: body.viewportY,
      zoom: body.zoom,
      layoutEngine: body.layoutEngine,
      nodes: body.nodes,
      edges: body.edges,
    });

    return NextResponse.json({ canvas: updated, success: true });
  } catch (error) {
    console.error('[API /api/canvas/[id] PATCH Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;
    const { id } = await params;

    const canvas = await getCanvasById(id);
    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
    }

    if (canvas.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await removeCanvas(id);
    return NextResponse.json({ success: true, message: 'Canvas deleted successfully' });
  } catch (error) {
    console.error('[API /api/canvas/[id] DELETE Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
