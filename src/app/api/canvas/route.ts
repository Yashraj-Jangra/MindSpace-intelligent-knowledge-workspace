import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getUserCanvases, createCanvas } from '@/lib/canvas-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const canvases = await getUserCanvases(userId);
    return NextResponse.json({ canvases });
  } catch (error) {
    console.error('[API /api/canvas GET Error]:', error);
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

    const body = await req.json().catch(() => ({}));
    const { title, description, nodes, edges } = body;

    const canvas = await createCanvas({
      userId,
      title: title || 'Untitled MindSpace',
      description,
      nodes,
      edges,
    });

    return NextResponse.json({ canvas, success: true });
  } catch (error) {
    console.error('[API /api/canvas POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
