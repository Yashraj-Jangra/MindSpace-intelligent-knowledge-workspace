import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getUserNotes, createNote } from '@/lib/notes-storage';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || '';

    const notes = await getUserNotes(userId, search, tag);
    return NextResponse.json({ notes });
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

    const { title, content, tags, priority, reminderAt } = await req.json();

    const note = await createNote({
      userId,
      title: title || 'Untitled Note',
      content: content || '',
      tags: tags || [],
      priority: priority || 'MEDIUM',
      reminderAt: reminderAt || null,
    });

    return NextResponse.json({ note, success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
