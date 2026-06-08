import { NextResponse } from 'next/server';
import { getNoteById, updateNote } from '@/lib/notes-storage';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AiGraphResponseSchema } from '@/lib/schemas/graph';
import { transformAiResponseToReactFlow } from '@/lib/graph/transformer';
import { calculateElkLayout } from '@/lib/graph/layout';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const note = await getNoteById(id);
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Generate Mind Map from Note Title & Content
    const { object: aiGraph } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: AiGraphResponseSchema,
      prompt: `You are a visual note converter.
Convert the following note into a visual mind map node graph.
Note Title: "${note.title}"
Note Content: "${note.content}"`,
    });

    const { nodes: rawNodes, edges: rawEdges } = transformAiResponseToReactFlow(aiGraph);
    const positionedNodes = await calculateElkLayout(rawNodes, rawEdges, 'RIGHT');

    let canvasId = note.canvasId;
    try {
      const newCanvas = await prisma.canvas.create({
        data: {
          userId: note.userId,
          title: `Map: ${note.title}`,
        },
      });
      canvasId = newCanvas.id;
      await updateNote(note.id, { canvasId: newCanvas.id });
    } catch (dbErr) {
      console.warn('[DB Warning]: Unable to persist canvas to database, returning graph payload.');
    }

    return NextResponse.json({
      canvasId: canvasId || `canvas_${note.id}`,
      title: `Map: ${note.title}`,
      nodes: positionedNodes,
      edges: rawEdges,
    });
  } catch (error) {
    console.error('[API /convert-canvas Error]:', error);
    return NextResponse.json(
      { error: 'Failed to convert note to mind map', details: (error as Error).message },
      { status: 500 }
    );
  }
}
