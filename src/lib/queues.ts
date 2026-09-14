import { Queue } from "bullmq";
import { redis } from "./redis";

export const remindersQueue = new Queue("reminders", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const digestQueue = new Queue("digest", {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
  },
});

export const webhookRetryQueue = new Queue("webhook-retry", {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: true,
  },
});

export const embeddingsQueue = new Queue("embeddings", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: true,
  },
});

export async function addReminderJob(notificationId: string, runAt: Date) {
  const delay = Math.max(0, runAt.getTime() - Date.now());
  return await remindersQueue.add("dispatch", { notificationId }, { delay });
}

export async function addDigestJob(userId: string) {
  return await digestQueue.add("generate", { userId });
}

export async function addWebhookRetryJob(payload: any) {
  return await webhookRetryQueue.add("retry", payload);
}

export async function addEmbeddingJob(
  entityType: "node" | "note" | "task",
  entityId: string,
  text: string,
) {
  return await embeddingsQueue.add("embed", { entityType, entityId, text });
}
