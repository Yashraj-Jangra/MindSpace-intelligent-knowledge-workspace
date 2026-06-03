import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AiGraphResponseSchema } from '@/lib/schemas/graph';
import { transformAiResponseToReactFlow } from '@/lib/graph/transformer';
import { calculateElkLayout } from '@/lib/graph/layout';
import { prisma } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';

export async function POST(req: Request) {
  try {
    const { prompt, canvasId, userId = 'default_user' } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 });
    }

    // 1. Generate Structured Graph from Text Prompt using Vercel AI SDK
    const { object: aiGraph } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: AiGraphResponseSchema,
      prompt: `You are an expert mind-mapping and knowledge structuring assistant.
Analyze the following text input and generate an interconnected visual node graph.
Break down key concepts, sub-topics, text notes, and deadlines into distinct nodes with semantic relationships.

User Input:
"${prompt}"`,
    });

    // 2. Transform AI JSON into React Flow Nodes and Edges
    const { nodes: rawNodes, edges: rawEdges } = transformAiResponseToReactFlow(aiGraph);

    // 3. Compute Auto-Layout Positioning using ELK.js
    const positionedNodes = await calculateElkLayout(rawNodes, rawEdges, 'RIGHT');

    // 4. Ensure or create User and Canvas in DB
    let targetCanvasId = canvasId;
    let dbUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { id: userId, email: `${userId}@mindspace.local`, name: 'MindSpace User' },
      });
    }

    if (!targetCanvasId) {
      const newCanvas = await prisma.canvas.create({
        data: {
          userId: dbUser.id,
          title: aiGraph.title || 'Untitled MindSpace Map',
        },
      });
      targetCanvasId = newCanvas.id;
    }

    // 5. Persist Nodes and Edges in Prisma Database
    await prisma.$transaction(async (tx) => {
      for (const node of positionedNodes) {
        await tx.node.create({
          data: {
            id: node.id,
            canvasId: targetCanvasId,
            parentId: node.data.parentId as string | undefined,
            type: node.data.type,
            label: node.data.label,
            markdown: node.data.markdown,
            positionX: node.position.x,
            positionY: node.position.y,
            color: node.data.color,
            reminderAt: node.data.reminderAt ? new Date(node.data.reminderAt) : null,
          },
        });
      }

      for (const edge of rawEdges) {
        await tx.edge.create({
          data: {
            id: edge.id,
            canvasId: targetCanvasId,
            sourceId: edge.source,
            targetId: edge.target,
            label: edge.label as string | undefined,
          },
        });
      }
    });

    // 6. Dispatch Webhook Event for canvas updates
    await dispatchWebhookEvent(dbUser.id, 'canvas.updated', {
      canvasId: targetCanvasId,
      nodeCount: positionedNodes.length,
      edgeCount: rawEdges.length,
    });

    return NextResponse.json({
      canvasId: targetCanvasId,
      title: aiGraph.title,
      nodes: positionedNodes,
      edges: rawEdges,
    });
  } catch (error) {
    console.error('[API /generate Error]:', error);
    return NextResponse.json(
      { error: 'Failed to generate visual graph', details: (error as Error).message },
      { status: 500 }
    );
  }
}
