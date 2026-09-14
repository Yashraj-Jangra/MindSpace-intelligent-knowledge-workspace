import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/db";
import { generateEmbedding } from "../lib/embeddings";

export const embeddingWorker = new Worker(
  "embeddings",
  async (job) => {
    const { entityType, entityId, text } = job.data;
    if (!text || typeof text !== "string" || !entityId) {
      return;
    }

    console.log(
      `[Embedding Worker] Processing job ${job.id} for ${entityType} ${entityId}`,
    );

    const vector = await generateEmbedding(text.slice(0, 8000));
    if (!vector || vector.length === 0) {
      console.warn(
        `[Embedding Worker] Failed to generate vector for ${entityType} ${entityId}`,
      );
      return;
    }

    const vectorString = `[${vector.join(",")}]`;

    if (entityType === "node") {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE nodes SET embedding = '${vectorString}'::vector WHERE id = '${entityId}'`,
        );
        console.log(
          `[Embedding Worker] Updated vector embedding for node ${entityId}`,
        );
      } catch (err) {
        console.error(
          `[Embedding Worker] DB update error on node ${entityId}:`,
          err,
        );
      }
    }
  },
  {
    connection: redis,
    concurrency: 4,
  },
);

embeddingWorker.on("completed", (job) => {
  console.log(`[Embedding Worker] Job ${job.id} completed successfully.`);
});

embeddingWorker.on("failed", (job, err) => {
  console.error(`[Embedding Worker] Job ${job?.id} failed:`, err.message);
});
