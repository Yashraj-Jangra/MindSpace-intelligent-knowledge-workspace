import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getTaskById, updateTask, removeTask } from '@/lib/task-storage';
import { z } from 'zod';

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueAt: z.string().optional().nullable(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notifyEvery: z.number().optional().nullable(),
  channels: z.array(z.string()).optional(),
});

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

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('[API /api/tasks/[id] GET Error]:', error);
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

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parser = updateTaskSchema.safeParse(body);

    if (!parser.success) {
      return NextResponse.json({ error: parser.error.message }, { status: 400 });
    }

    const updated = await updateTask(id, parser.data);
    return NextResponse.json({ task: updated, success: true });
  } catch (error) {
    console.error('[API /api/tasks/[id] PATCH Error]:', error);
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

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await removeTask(id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('[API /api/tasks/[id] DELETE Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
