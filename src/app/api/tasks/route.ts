import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { getUserTasks, createTask } from '@/lib/task-storage';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  dueAt: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notifyEvery: z.number().optional().nullable(),
  channels: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    const tasks = await getUserTasks(userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[API /api/tasks GET Error]:', error);
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
    const parser = createTaskSchema.safeParse(body);

    if (!parser.success) {
      return NextResponse.json({ error: parser.error.message }, { status: 400 });
    }

    const { title, description, parentId, priority, dueAt, tags, notifyEvery, channels } = parser.data;

    const task = await createTask({
      userId,
      title,
      description,
      parentId,
      priority,
      dueAt,
      tags,
      notifyEvery,
      channels,
    });

    return NextResponse.json({ task, success: true });
  } catch (error) {
    console.error('[API /api/tasks POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
