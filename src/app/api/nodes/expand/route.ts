import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AiGraphResponseSchema } from '@/lib/schemas/graph';
import { transformAiResponseToReactFlow, MindSpaceNodeData } from '@/lib/graph/transformer';
import { calculateElkLayout } from '@/lib/graph/layout';
import { prisma } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { NodeType } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const { canvasId, nodeId, label, markdown, userId = 'default_user' } = await req.json();

    if (!nodeId || !label) {
      return NextResponse.json({ error: 'nodeId and label are required' }, { status: 400 });
    }

    // 1. Generate Sub-Topics for Target Node using Vercel AI SDK
    const { object: aiGraph } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: AiGraphResponseSchema,
      prompt: `You are expanding a specific topic in a MindSpace visual map.
Parent Node Topic: "${label}"
Parent Node Details: "${markdown || ''}"

Generate 3 to 5 logical sub-topic nodes that expand deeply into this parent concept.
Set the parentId of sub-nodes to "root-node". Connect them to root-node.`,
    });

    const { nodes: newNodes, edges: newEdges } = transformAiResponseToReactFlow(aiGraph);

    // Update parent relation to target nodeId
    const updatedNodes = newNodes.map((n) => ({
      ...n,
      data: { ...n.data, parentId: nodeId },
    }));

    const updatedEdges = newEdges.map((e, idx) => {
      if (idx === 0 || e.source.includes('root-node') || e.target.includes('root-node')) {
        return { ...e, source: nodeId };
      }
      return e;
    });

    const positionedNodes = await calculateElkLayout(updatedNodes, updatedEdges, 'RIGHT');

    // 2. Persist new sub-nodes in Database if canvasId exists
    if (canvasId) {
      await prisma.$transaction(async (tx) => {
        for (const node of positionedNodes) {
          const data = node.data as MindSpaceNodeData;
          const nodeType = (data.type as NodeType) || NodeType.CONCEPT;

          await tx.node.create({
            data: {
              id: node.id,
              canvasId,
              parentId: nodeId,
              type: nodeType,
              label: data.label || 'Sub Node',
              markdown: data.markdown || '',
              positionX: node.position.x + 300,
              positionY: node.position.y,
              color: data.color || '#FF3D00',
            },
          });
        }

        for (const edge of updatedEdges) {
          await tx.edge.create({
            data: {
              id: edge.id,
              canvasId,
              sourceId: edge.source,
              targetId: edge.target,
              label: edge.label as string | undefined,
            },
          });
        }
      });

      await dispatchWebhookEvent(userId, 'node.created', {
        canvasId,
        parentNodeId: nodeId,
        expandedNodeCount: positionedNodes.length,
      });
    }

    return NextResponse.json({
      nodes: positionedNodes,
      edges: updatedEdges,
    });
  } catch (error) {
    console.error('[API /nodes/expand Error]:', error);
    return NextResponse.json(
      { error: 'Failed to expand node topic', details: (error as Error).message },
      { status: 500 }
    );
  }
}
