import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getCalendarEvents, createCalendarEvent } from '@/lib/calendar-storage';
import { getUserTasks } from '@/lib/task-storage';
import { getUserNotes } from '@/lib/notes-storage';
import { redis } from '@/lib/redis';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const fromDate = fromStr ? new Date(fromStr) : null;
    const toDate = toStr ? new Date(toStr) : null;

    // Fetch from all 3 sources
    const [customEvents, userTasks, userNotes] = await Promise.all([
      getCalendarEvents(userId),
      getUserTasks(userId),
      getUserNotes(userId),
    ]);

    const aggregated: any[] = [];

    // 1. Custom Calendar Events
    for (const ev of customEvents) {
      const evStart = new Date(ev.startAt);
      if (fromDate && evStart < fromDate) continue;
      if (toDate && evStart > toDate) continue;

      aggregated.push({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        startAt: ev.startAt,
        endAt: ev.endAt,
        isAllDay: ev.isAllDay,
        location: ev.location,
        color: ev.color || '#4285F4',
        recurrence: ev.recurrence,
        sourceType: 'EVENT',
        sourceId: ev.id,
      });
    }

    // 2. Tasks with due dates
    for (const task of userTasks) {
      if (!task.dueAt) continue;
      const tDue = new Date(task.dueAt);
      if (fromDate && tDue < fromDate) continue;
      if (toDate && tDue > toDate) continue;

      aggregated.push({
        id: `task_${task.id}`,
        title: task.title,
        description: task.description || `Priority: ${task.priority} | Status: ${task.status}`,
        startAt: task.dueAt,
        endAt: null,
        isAllDay: false,
        location: null,
        color: '#10B981', // Emerald for tasks
        recurrence: 'NONE',
        sourceType: 'TASK',
        sourceId: task.id,
        status: task.status,
        priority: task.priority,
        subtasks: task.subtasks || [],
      });
    }

    // 3. Notes with reminders
    for (const note of userNotes) {
      if (!note.reminderAt) continue;
      const nRem = new Date(note.reminderAt);
      if (fromDate && nRem < fromDate) continue;
      if (toDate && nRem > toDate) continue;

      aggregated.push({
        id: `note_${note.id}`,
        title: note.title,
        description: note.content ? note.content.substring(0, 120) : 'Note reminder',
        startAt: note.reminderAt,
        endAt: null,
        isAllDay: false,
        location: null,
        color: '#FF3D00', // Vermillion for note reminders
        recurrence: 'NONE',
        sourceType: 'NOTE',
        sourceId: note.id,
        tags: note.tags || [],
        priority: note.priority,
      });
    }

    return NextResponse.json({ events: aggregated });
  } catch (error) {
    console.error('[API /calendar/events GET Error]:', error);
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

    const body = await req.json();
    const { title, description, startAt, endAt, isAllDay, location, color, recurrence } = body;

    if (!title || !startAt) {
      return NextResponse.json({ error: 'Title and startAt are required.' }, { status: 400 });
    }

    const event = await createCalendarEvent(userId, {
      title,
      description,
      startAt,
      endAt,
      isAllDay,
      location,
      color,
      recurrence,
    });

    // Notify clients over Redis/Socket.io
    await redis.publish('socket-emit', JSON.stringify({
      room: `user:${userId}`,
      event: 'calendar:updated',
      data: event,
    }));

    return NextResponse.json({ event });
  } catch (error) {
    console.error('[API /calendar/events POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
