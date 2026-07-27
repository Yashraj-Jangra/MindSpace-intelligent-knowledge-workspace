import crypto from 'crypto';
import { prisma } from '../db';

export type WebhookEvent = 'node.created' | 'node.updated' | 'reminder.fired' | 'canvas.updated' | 'task.completed';

export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, any>
) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId, isActive: true },
    });

    const matchingWebhooks = webhooks.filter(
      (wh) => wh.events.includes(event) || wh.events.includes('*')
    );

    if (matchingWebhooks.length === 0) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event, timestamp, data: payload });

    await Promise.all(
      matchingWebhooks.map(async (wh) => {
        const signature = crypto
          .createHmac('sha256', wh.secret || process.env.WEBHOOK_SECRET_KEY || 'mindspace_secret')
          .update(`${timestamp}.${body}`)
          .digest('hex');

        try {
          await fetch(wh.targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-MindSpace-Signature': `t=${timestamp},v1=${signature}`,
              'X-MindSpace-Event': event,
            },
            body,
          });
        } catch (err) {
          console.error(`[Webhook Dispatch Error] Failed to send ${event} to ${wh.targetUrl}:`, err);
        }
      })
    );
  } catch (error) {
    console.error('[Webhook Dispatch Exception]:', error);
  }
}
