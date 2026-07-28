import { NextResponse } from 'next/server';
import { prisma, isDbDisabled } from '@/lib/db';
import { addReminderJob } from '@/lib/queues';

export async function GET(req: Request) {
  return handleCron();
}

export async function POST(req: Request) {
  return handleCron();
}

async function handleCron() {
  try {
    if (isDbDisabled()) {
      return NextResponse.json({ error: 'Database is disabled' }, { status: 503 });
    }

    const now = new Date();

    // Query PENDING notifications scheduled for <= now
    const pendingNotifications = await prisma.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
    });

    console.log(`[Reminders Cron] Found ${pendingNotifications.length} due notifications.`);

    const enqueued: string[] = [];
    for (const notif of pendingNotifications) {
      try {
        await addReminderJob(notif.id, notif.scheduledFor);
        
        // Mark as DISPATCHED immediately to prevent double processing in subsequent cron sweeps
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            status: 'DISPATCHED',
          },
        });
        enqueued.push(notif.id);
      } catch (err) {
        console.error(`[Reminders Cron] Failed to enqueue notification ${notif.id}:`, err);
      }
    }

    return NextResponse.json({
      message: `Enqueued ${enqueued.length} notifications`,
      ids: enqueued,
    });
  } catch (error) {
    console.error('[Reminders Cron Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
