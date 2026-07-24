import { NextResponse } from 'next/server';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.id;

    if (!isDbDisabled()) {
      try {
        const notifications = await prisma.notification.findMany({
          where: { userId },
          include: { node: true },
          orderBy: { scheduledFor: 'asc' },
        });

        return NextResponse.json({ notifications });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    return NextResponse.json({ notifications: [] });
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

    const { nodeId, reminderAt, title, message } = await req.json();

    if (!nodeId || !reminderAt) {
      return NextResponse.json({ error: 'nodeId and reminderAt timestamp are required' }, { status: 400 });
    }

    const scheduledDate = new Date(reminderAt);

    if (!isDbDisabled()) {
      try {
        const updatedNode = await prisma.node.update({
          where: { id: nodeId },
          data: { reminderAt: scheduledDate, type: 'REMINDER_NODE' },
        });

        const notification = await prisma.notification.create({
          data: {
            userId,
            nodeId,
            title: title || `Reminder: ${updatedNode.label}`,
            message: message || updatedNode.markdown || 'Node task deadline',
            scheduledFor: scheduledDate,
          },
        });

        await dispatchWebhookEvent(userId, 'reminder.fired', {
          notificationId: notification.id,
          nodeId,
          scheduledFor: scheduledDate.toISOString(),
        });

        return NextResponse.json({ notification, node: updatedNode });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    }

    // Fallback response when DB disabled
    const mockNotification = {
      id: `notif_${Date.now()}`,
      userId,
      nodeId,
      title: title || 'Reminder',
      message: message || 'Node deadline',
      scheduledFor: scheduledDate.toISOString(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ notification: mockNotification, node: null });
  } catch (error) {
    console.error('[API /reminders POST Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
