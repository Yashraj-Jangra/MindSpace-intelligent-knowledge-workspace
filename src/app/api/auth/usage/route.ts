import { NextResponse } from 'next/server';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from '@/lib/db';
import { getSessionFromCookie } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let canvasCount = 0;
    let noteCount = 0;
    let nodeCount = 0;

    if (!isDbDisabled()) {
      try {
        canvasCount = await prisma.canvas.count({
          where: { userId: session.id },
        });

        noteCount = await prisma.note.count({
          where: { userId: session.id },
        });

        nodeCount = await prisma.node.count({
          where: {
            canvas: {
              userId: session.id,
            },
          },
        });
      } catch (err) {
        disableDbCircuitBreaker();
      }
    } else {
      // Return mock values if DB is disabled
      canvasCount = 3;
      noteCount = 12;
      nodeCount = 45;
    }

    // Dynamic formula for storage size in MB:
    // - Each canvas is estimated at ~1.5 MB
    // - Each note is estimated at ~0.12 MB
    // - Each node is estimated at ~0.04 MB
    const storageUsed = Number(((canvasCount * 1.5) + (noteCount * 0.12) + (nodeCount * 0.04)).toFixed(2));
    const storageLimit = 100.0; // 100 MB quota limit

    return NextResponse.json({
      canvasCount,
      noteCount,
      nodeCount,
      storageUsed,
      storageLimit,
    });
  } catch (error) {
    console.error('[API /auth/usage GET Error]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
