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
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawText = formData.get('text') as string | null;
    const canvasId = formData.get('canvasId') as string | null;
    const userId = (formData.get('userId') as string) || 'default_user';

    let documentContent = rawText || '';

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const textDecoder = new TextDecoder('utf-8');
      documentContent = textDecoder.decode(arrayBuffer);
    }

    if (!documentContent.trim()) {
      return NextResponse.json({ error: 'Document text or file is empty' }, { status: 400 });
    }

    // 1. Run LLM Structure Synthesis on Document Content
    const { object: aiGraph } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: AiGraphResponseSchema,
      prompt: `You are an expert document summarizer and visual graph extractor.
Analyze the following document text and extract a comprehensive hierarchical mind map.
Identify the main document title root node, key chapters/sections as primary branch nodes, and core concepts as sub-nodes.

Document Content:
"${documentContent.slice(0, 15000)}"`,
    });

    // 2. Transform into React Flow format
    const { nodes: rawNodes, edges: rawEdges } = transformAiResponseToReactFlow(aiGraph);

    // 3. Compute Auto-Layout
    const positionedNodes = await calculateElkLayout(rawNodes, rawEdges, 'RIGHT');

    // 4. Ensure DB User & Canvas
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
          title: aiGraph.title || file?.name || 'Document Summary Map',
        },
      });
      targetCanvasId = newCanvas.id;
    }

    // 5. Persist Nodes and Edges in DB
    await prisma.$transaction(async (tx) => {
      for (const node of positionedNodes) {
        await tx.node.create({
          data: {
            id: node.id,
            canvasId: targetCanvasId,
            parentId: node.data.parentId as string | undefined,
            type: 'DOCUMENT',
            label: node.data.label,
            markdown: node.data.markdown,
            positionX: node.position.x,
            positionY: node.position.y,
            color: '#10b981',
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
      source: 'document_parse',
      nodeCount: positionedNodes.length,
    });

    return NextResponse.json({
      canvasId: targetCanvasId,
      title: aiGraph.title || file?.name || 'Document Summary Map',
      nodes: positionedNodes,
      edges: rawEdges,
    });
  } catch (error) {
    console.error('[API /parse-document Error]:', error);
    return NextResponse.json(
      { error: 'Failed to parse document', details: (error as Error).message },
      { status: 500 }
    );
  }
}
