import { Worker } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/db';
import { sendMindSpaceEmail } from '../lib/email/mailer';
import { sendDiscordNotification, sendDiscordDm } from '../lib/discord/bot';
import { sendTelegramNotification } from '../lib/telegram/bot';
import { dispatchWebhookEvent } from '../lib/webhooks/dispatcher';
import { getSystemSetting } from '../lib/settings';

const worker = new Worker(
  'reminders',
  async (job) => {
    const { notificationId } = job.data;
    console.log(`[Reminder Worker] Processing job ${job.id} for notification ${notificationId}`);

    // Fetch the notification from Prisma
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          include: {
            discordAccount: true,
            telegramAccount: true,
          },
        },
      },
    });

    if (!notification) {
      console.warn(`[Reminder Worker] Notification ${notificationId} not found in database.`);
      return;
    }

    const { userId, title, message, channels, noteId, nodeId, taskId } = notification;

    const errors: string[] = [];

    for (const channel of channels) {
      try {
        console.log(`[Reminder Worker] Dispatching on channel: ${channel} for user ${userId}`);
        if (channel === 'in_app') {
          // Send via Redis Pub/Sub so that Socket.io server can emit to the correct rooms
          await redis.publish(
            'socket-emit',
            JSON.stringify({
              room: `user:${userId}`,
              event: 'notification:new',
              data: {
                id: notification.id,
                title,
                message,
                noteId,
                nodeId,
                taskId,
                createdAt: new Date().toISOString(),
              },
            })
          );
        } else if (channel === 'email') {
          if (notification.user.email) {
            await sendMindSpaceEmail({
              to: notification.user.email,
              subject: `[MINDSPACE] ${title}`,
              title,
              message,
              userId,
            });
          }
        } else if (channel === 'discord') {
          const discordAcc = notification.user.discordAccount;
          if (discordAcc && discordAcc.isPaired) {
            if (discordAcc.webhookUrl) {
              await sendDiscordNotification(discordAcc.webhookUrl, title, message);
            } else if (discordAcc.discordUserId) {
              const botToken = discordAcc.botToken || await getSystemSetting('DISCORD_BOT_TOKEN');
              if (botToken) {
                await sendDiscordDm(botToken, discordAcc.discordUserId, title, message);
              } else {
                console.warn(`[Reminder Worker] No Discord bot token configured for direct messaging.`);
              }
            }
          }
        } else if (channel === 'telegram') {
          await sendTelegramNotification(userId, title, message);
        } else if (channel === 'webhook') {
          await dispatchWebhookEvent(userId, 'reminder.fired', {
            notificationId: notification.id,
            title,
            message,
            noteId,
            nodeId,
            taskId,
            scheduledFor: notification.scheduledFor.toISOString(),
          });
        }
      } catch (err) {
        const errMsg = (err as Error).message;
        console.error(`[Reminder Worker] Error dispatching on channel ${channel}:`, err);
        errors.push(`${channel}: ${errMsg}`);
      }
    }

    // Update status in the database
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'DISPATCHED',
        dispatchedAt: new Date(),
        retryCount: notification.retryCount + 1,
        lastError: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    if (errors.length > 0) {
      throw new Error(`Failed to dispatch on some channels: ${errors.join('; ')}`);
    }
  },
  { connection: redis }
);

worker.on('completed', (job) => {
  console.log(`[Reminder Worker] Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Reminder Worker] Job ${job?.id} failed:`, err);
});

console.log('[Reminder Worker] Process started and listening to reminders queue.');
