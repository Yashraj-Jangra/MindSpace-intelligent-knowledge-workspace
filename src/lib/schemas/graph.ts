import { z } from 'zod';

export const AiNodeSchema = z.object({
  tempId: z.string().describe("Unique temporal identifier e.g. 'node-1', 'node-2'"),
  label: z.string().describe("Concise 2-6 word topic headline"),
  summary: z.string().describe("Markdown summary explanation of the topic"),
  type: z.enum(['CONCEPT', 'TEXT_NOTE', 'WEB_CLIP', 'DOCUMENT', 'REMINDER_NODE']).default('CONCEPT'),
  colorHint: z.string().optional().describe("Hex color hint e.g. '#FF3D00' or '#3b82f6'"),
  parentId: z.string().optional().describe("tempId of parent node if hierarchical"),
  reminderAt: z.string().optional().describe("Optional ISO date string if node represents a task/deadline"),
});

export const AiEdgeSchema = z.object({
  sourceTempId: z.string(),
  targetTempId: z.string(),
  label: z.string().optional().describe("Semantic relationship type e.g., 'Leads to', 'Requires', 'Part of'"),
  relation: z.string().default('ASSOCIATED_WITH'),
});

export const AiGraphResponseSchema = z.object({
  title: z.string().describe("Suggested MindSpace map title"),
  nodes: z.array(AiNodeSchema),
  edges: z.array(AiEdgeSchema),
});

export type AiNode = z.infer<typeof AiNodeSchema>;
export type AiEdge = z.infer<typeof AiEdgeSchema>;
export type AiGraphResponse = z.infer<typeof AiGraphResponseSchema>;
