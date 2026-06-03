import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: { node: true },
      orderBy: { scheduledFor: 'asc' },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nodeId, reminderAt, title, message, userId = 'default_user' } = await req.json();

    if (!nodeId || !reminderAt) {
      return NextResponse.json({ error: 'nodeId and reminderAt timestamp are required' }, { status: 400 });
    }

    const scheduledDate = new Date(reminderAt);

    // Update node deadline
    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: { reminderAt: scheduledDate, type: 'REMINDER_NODE' },
    });

    // Create Notification Record
    const notification = await prisma.notification.create({
      data: {
        userId,
        nodeId,
        title: title || `Reminder: ${updatedNode.label}`,
        message: message || updatedNode.markdown || 'Node task deadline',
        scheduledFor: scheduledDate,
      },
    });

    // Trigger webhook event
    await dispatchWebhookEvent(userId, 'reminder.fired', {
      notificationId: notification.id,
      nodeId,
      scheduledFor: scheduledDate.toISOString(),
    });

    return NextResponse.json({ notification, node: updatedNode });
  } catch (error) {
    console.error('[API /reminders POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
