import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getTaskById, completeTask } from '@/lib/task-storage';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';

export async function POST(
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

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await completeTask(id);
    if (updated) {
      // Dispatch completing event via webhook
      await dispatchWebhookEvent(userId, 'task.completed', {
        taskId: updated.id,
        title: updated.title,
        status: updated.status,
        completedAt: updated.completedAt,
      });
    }

    return NextResponse.json({ task: updated, success: true });
  } catch (error) {
    console.error('[API /api/tasks/[id]/complete POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
