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

    let aiGraph: { title: string; nodes: any[]; edges: any[] };

    try {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-openai-api-key')) {
        throw new Error('No valid OpenAI API key configured');
      }

      // Generate Sub-Topics using OpenAI Vercel AI SDK
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: AiGraphResponseSchema,
        prompt: `You are expanding a specific topic in a MindSpace visual map.
Parent Node Topic: "${label}"
Parent Node Details: "${markdown || ''}"

Generate 3 to 5 logical sub-topic nodes that expand deeply into this parent concept.
Set the parentId of sub-nodes to "root-node". Connect them to root-node.`,
      });
      aiGraph = object;
    } catch (aiErr) {
      console.warn('[AI Expand Fallback]: Generating fallback sub-topic nodes.', (aiErr as Error).message);
      // Smart Fallback Sub-Topic Generator
      aiGraph = {
        title: `Expansion: ${label}`,
        nodes: [
          {
            id: 'root-node',
            label: label,
            markdown: markdown || `Deep dive into ${label}`,
            type: 'CONCEPT',
            color: '#FF3D00',
          },
          {
            id: 'sub-1',
            label: `${label} Overview`,
            markdown: `Fundamental principles, background context, and core definitions for ${label}.`,
            type: 'CONCEPT',
            color: '#3B82F6',
            parentId: 'root-node',
          },
          {
            id: 'sub-2',
            label: `Key Components & Specs`,
            markdown: `Detailed breakdown of architecture, technical specifications, and design patterns.`,
            type: 'NOTE',
            color: '#10B981',
            parentId: 'root-node',
          },
          {
            id: 'sub-3',
            label: `Execution & Milestones`,
            markdown: `Step-by-step implementation plan, task list, and key delivery dates.`,
            type: 'TASK',
            color: '#F59E0B',
            parentId: 'root-node',
          },
          {
            id: 'sub-4',
            label: `Edge Cases & Optimization`,
            markdown: `Performance tuning, error resilience, fallback strategies, and edge case handling.`,
            type: 'NOTE',
            color: '#8B5CF6',
            parentId: 'root-node',
          },
        ],
        edges: [
          { source: 'root-node', target: 'sub-1', label: 'includes' },
          { source: 'root-node', target: 'sub-2', label: 'requires' },
          { source: 'root-node', target: 'sub-3', label: 'executes' },
          { source: 'root-node', target: 'sub-4', label: 'optimizes' },
        ],
      };
    }

    const { nodes: newNodes, edges: newEdges } = transformAiResponseToReactFlow(aiGraph);

    // Update parent relation to target nodeId
    const updatedNodes = newNodes.map((n) => ({
      ...n,
      id: `${nodeId}-${n.id}`,
      data: { ...n.data, parentId: nodeId },
    }));

    const updatedEdges = newEdges.map((e) => ({
      ...e,
      id: `${nodeId}-${e.id}`,
      source: e.source === 'root-node' ? nodeId : `${nodeId}-${e.source}`,
      target: e.target === 'root-node' ? nodeId : `${nodeId}-${e.target}`,
    }));

    const positionedNodes = await calculateElkLayout(updatedNodes, updatedEdges, 'RIGHT');

    // Persist new sub-nodes in Database if DB is available
    if (canvasId) {
      try {
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
      } catch (dbErr) {
        console.warn('[DB Persist Fallback]: Node expansion output returned directly.', (dbErr as Error).message);
      }
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
