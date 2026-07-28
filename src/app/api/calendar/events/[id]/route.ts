import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/calendar-storage';
import { updateTask } from '@/lib/task-storage';
import { updateNote } from '@/lib/notes-storage';
import { redis } from '@/lib/redis';

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

    const body = await req.json();

    if (id.startsWith('task_')) {
      const realTaskId = id.replace('task_', '');
      const updated = await updateTask(realTaskId, {
        dueAt: body.startAt || null,
      });

      await redis.publish('socket-emit', JSON.stringify({
        room: `user:${userId}`,
        event: 'task:updated',
        data: updated,
      }));

      return NextResponse.json({ item: updated });
    }

    if (id.startsWith('note_')) {
      const realNoteId = id.replace('note_', '');
      const updated = await updateNote(realNoteId, {
        reminderAt: body.startAt || null,
      });

      await redis.publish('socket-emit', JSON.stringify({
        room: `user:${userId}`,
        event: 'note:updated',
        data: updated,
      }));

      return NextResponse.json({ item: updated });
    }

    // Custom Calendar Event
    const updated = await updateCalendarEvent(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    await redis.publish('socket-emit', JSON.stringify({
      room: `user:${userId}`,
      event: 'calendar:updated',
      data: updated,
    }));

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error('[API /calendar/events/[id] PATCH Error]:', error);
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

    if (id.startsWith('task_')) {
      const realTaskId = id.replace('task_', '');
      const updated = await updateTask(realTaskId, { dueAt: null });
      return NextResponse.json({ success: true, item: updated });
    }

    if (id.startsWith('note_')) {
      const realNoteId = id.replace('note_', '');
      const updated = await updateNote(realNoteId, { reminderAt: null });
      return NextResponse.json({ success: true, item: updated });
    }

    const success = await deleteCalendarEvent(userId, id);
    if (!success) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await redis.publish('socket-emit', JSON.stringify({
      room: `user:${userId}`,
      event: 'calendar:deleted',
      data: { id },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /calendar/events/[id] DELETE Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
