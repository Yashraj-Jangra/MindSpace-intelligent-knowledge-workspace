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
    const { prompt, canvasId, userId = 'default_user' } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 });
    }

    let aiGraph: { title: string; nodes: any[]; edges: any[] };

    try {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-openai-api-key')) {
        throw new Error('No valid OpenAI API key configured');
      }

      // Generate Structured Graph using OpenAI Vercel AI SDK
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: AiGraphResponseSchema,
        prompt: `You are an expert mind-mapping and knowledge structuring assistant.
Analyze the following text input and generate an interconnected visual node graph.
Break down key concepts, sub-topics, text notes, and deadlines into distinct nodes with semantic relationships.

User Input:
"${prompt}"`,
      });
      aiGraph = object;
    } catch (aiErr) {
      console.warn('[AI Generate Fallback]: Generating fallback graph nodes.', (aiErr as Error).message);
      aiGraph = {
        title: prompt.slice(0, 30) || 'Visual Graph Map',
        nodes: [
          {
            id: 'root-1',
            label: prompt.length > 35 ? `${prompt.slice(0, 35)}...` : prompt,
            markdown: prompt,
            type: 'CONCEPT',
            color: '#FF3D00',
          },
          {
            id: 'node-2',
            label: 'Core Architecture',
            markdown: 'High-level system design, data flow, and fundamental components.',
            type: 'CONCEPT',
            color: '#3B82F6',
            parentId: 'root-1',
          },
          {
            id: 'node-3',
            label: 'Implementation Tasks',
            markdown: 'Actionable steps, technical prerequisites, and dev deliverables.',
            type: 'TASK',
            color: '#10B981',
            parentId: 'root-1',
          },
          {
            id: 'node-4',
            label: 'Research & Notes',
            markdown: 'Contextual references, API documentation, and key notes.',
            type: 'NOTE',
            color: '#F59E0B',
            parentId: 'node-2',
          },
        ],
        edges: [
          { source: 'root-1', target: 'node-2', label: 'defines' },
          { source: 'root-1', target: 'node-3', label: 'requires' },
          { source: 'node-2', target: 'node-4', label: 'references' },
        ],
      };
    }

    // Transform AI JSON into React Flow Nodes and Edges
    const { nodes: rawNodes, edges: rawEdges } = transformAiResponseToReactFlow(aiGraph);

    // Compute Auto-Layout Positioning using ELK.js
    const positionedNodes = await calculateElkLayout(rawNodes, rawEdges, 'RIGHT');

    let targetCanvasId = canvasId || `canvas_${Math.random().toString(36).slice(2, 10)}`;

    // Try DB persistence if available
    try {
      let dbUser = await prisma.user.findUnique({ where: { id: userId } });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: { id: userId, email: `${userId}@mindspace.local`, name: 'MindSpace User' },
        });
      }

      if (!canvasId) {
        const newCanvas = await prisma.canvas.create({
          data: {
            userId: dbUser.id,
            title: aiGraph.title || 'Untitled MindSpace Map',
          },
        });
        targetCanvasId = newCanvas.id;
      }

      await prisma.$transaction(async (tx) => {
        for (const node of positionedNodes) {
          const data = node.data as MindSpaceNodeData;
          const nodeType = (data.type as NodeType) || NodeType.CONCEPT;
          const reminderDate = data.reminderAt ? new Date(data.reminderAt) : null;

          await tx.node.create({
            data: {
              id: node.id,
              canvasId: targetCanvasId,
              parentId: data.parentId,
              type: nodeType,
              label: data.label || 'Node',
              markdown: data.markdown || '',
              positionX: node.position.x,
              positionY: node.position.y,
              color: data.color || '#FF3D00',
              reminderAt: reminderDate,
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

      await dispatchWebhookEvent(dbUser.id, 'canvas.updated', {
        canvasId: targetCanvasId,
        nodeCount: positionedNodes.length,
        edgeCount: rawEdges.length,
      });
    } catch (dbErr) {
      console.warn('[DB Persist Fallback]: Graph generated directly.', (dbErr as Error).message);
    }

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
