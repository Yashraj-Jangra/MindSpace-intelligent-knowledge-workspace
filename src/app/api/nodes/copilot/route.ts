import { NextResponse } from 'next/server';
import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';

const AutoLinkEdgesSchema = z.object({
  suggestedEdges: z.array(
    z.object({
      sourceId: z.string(),
      targetId: z.string(),
      label: z.string().describe("Semantic relationship type between these two nodes"),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const { action, nodeId, label, markdown, tone = 'executive', canvasId, userId = 'default_user' } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    // 1. Summarize Node Note
    if (action === 'summarize') {
      const { text: summaryText } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Summarize the following topic notes into 3 clear, high-impact bullet points:
Headline: "${label}"
Notes: "${markdown || ''}"`,
      });

      if (nodeId) {
        await prisma.node.update({
          where: { id: nodeId },
          data: { markdown: summaryText },
        });
      }

      return NextResponse.json({ summary: summaryText });
    }

    // 2. Rewrite / Rephrase Note Tone
    if (action === 'rewrite') {
      const { text: rewrittenText } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Rephrase and rewrite the following text note in a ${tone} tone. Keep key facts exact:
Text: "${markdown || label}"`,
      });

      if (nodeId) {
        await prisma.node.update({
          where: { id: nodeId },
          data: { markdown: rewrittenText },
        });
      }

      return NextResponse.json({ rewritten: rewrittenText });
    }

    // 3. Auto-Link Missing Connections across Canvas Nodes
    if (action === 'auto-link') {
      if (!canvasId) {
        return NextResponse.json({ error: 'canvasId required for auto-link' }, { status: 400 });
      }

      const canvasNodes = await prisma.node.findMany({
        where: { canvasId },
        select: { id: true, label: true, markdown: true },
      });

      if (canvasNodes.length < 2) {
        return NextResponse.json({ newEdges: [] });
      }

      const { object: result } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: AutoLinkEdgesSchema,
        prompt: `Analyze the following set of mind map nodes and discover 2 to 4 hidden semantic connections/relationships between nodes that are NOT obvious.
Return the sourceId, targetId, and a concise 2-4 word relationship label.

Nodes:
${JSON.stringify(canvasNodes, null, 2)}`,
      });

      const createdEdges = [];
      for (const e of result.suggestedEdges) {
        try {
          const newEdge = await prisma.edge.create({
            data: {
              canvasId,
              sourceId: e.sourceId,
              targetId: e.targetId,
              label: e.label,
              edgeType: 'SMOOTHSTEP',
              animated: true,
            },
          });
          createdEdges.push(newEdge);
        } catch {
          // Ignore duplicate constraint violations
        }
      }

      await dispatchWebhookEvent(userId, 'node.updated', {
        canvasId,
        action: 'auto-link',
        newEdgesCount: createdEdges.length,
      });

      return NextResponse.json({ newEdges: createdEdges });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[API /nodes/copilot Error]:', error);
    return NextResponse.json(
      { error: 'Copilot action failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
