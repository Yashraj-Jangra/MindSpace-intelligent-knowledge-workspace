import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getUserCaptures, createCapture } from '@/lib/capture-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const captures = await getUserCaptures(userId);
    return NextResponse.json({ captures });
  } catch (error) {
    console.error('[API /api/hub/capture GET Error]:', error);
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
    const { rawText, sourceUrl } = body;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: 'rawText content is required' }, { status: 400 });
    }

    const capture = await createCapture({
      userId,
      rawText: rawText.trim(),
      sourceUrl,
    });

    return NextResponse.json({ capture, success: true });
  } catch (error) {
    console.error('[API /api/hub/capture POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
