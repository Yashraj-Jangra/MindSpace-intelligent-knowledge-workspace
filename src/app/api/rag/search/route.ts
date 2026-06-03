import { NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { query, canvasId, limit = 5 } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Generate Query Embedding Vector using OpenAI text-embedding-3-small
    const queryVector = await generateEmbedding(query);

    // Fallback: If vector embedding is empty, perform text search
    if (queryVector.length === 0) {
      const textMatches = await prisma.node.findMany({
        where: {
          canvasId: canvasId || undefined,
          OR: [
            { label: { contains: query, mode: 'insensitive' } },
            { markdown: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
      });

      return NextResponse.json({
        matches: textMatches.map((node) => ({ node, score: 0.8 })),
      });
    }

    // Execute Native PostgreSQL pgvector Cosine Distance Query
    const vectorString = `[${queryVector.join(',')}]`;
    const vectorMatches = await prisma.$queryRaw<Array<{ id: string; label: string; markdown: string; positionX: number; positionY: number; distance: number }>>`
      SELECT id, label, markdown, "positionX", "positionY", (embedding <=> ${vectorString}::vector) as distance
      FROM nodes
      WHERE (${canvasId}::text IS NULL OR "canvasId" = ${canvasId})
      ORDER BY distance ASC
      LIMIT ${limit};
    `;

    return NextResponse.json({
      matches: vectorMatches.map((m) => ({
        node: m,
        score: 1 - (m.distance || 0),
      })),
    });
  } catch (error) {
    console.error('[API /rag/search Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
