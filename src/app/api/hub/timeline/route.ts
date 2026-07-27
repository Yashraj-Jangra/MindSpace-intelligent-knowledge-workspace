import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getUserNotes } from '@/lib/notes-storage';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const notes = await getUserNotes(userId);
    const now = new Date();

    const timelineItems = notes
      .filter((n) => n.reminderAt)
      .map((n) => {
        const reminderDate = new Date(n.reminderAt!);
        const isToday = reminderDate.toDateString() === now.toDateString();
        const isOverdue = reminderDate < now && !isToday;

        let urgency: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
        if (isToday) {
          urgency = 'DUE_TODAY';
        } else if (isOverdue) {
          urgency = 'OVERDUE';
        }

        return {
          id: n.id,
          type: 'NOTE_REMINDER' as const,
          title: n.title || 'Untitled Note',
          urgency,
          deadlineAt: n.reminderAt!,
          sourceId: n.id,
          sourceUrl: `/notes/${n.id}`,
        };
      });

    // Sort: OVERDUE first -> DUE_TODAY -> UPCOMING, then chronologically
    const urgencyWeight = {
      OVERDUE: 0,
      DUE_TODAY: 1,
      UPCOMING: 2,
    };

    timelineItems.sort((a, b) => {
      if (urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]) {
        return urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
      }
      return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
    });

    return NextResponse.json({ items: timelineItems });
  } catch (error) {
    console.error('[API /api/hub/timeline GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
