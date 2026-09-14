import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserNotes } from "@/lib/notes-storage";
import { getUserCanvases } from "@/lib/canvas-storage";
import { getUserTasks } from "@/lib/task-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();

    if (!query) {
      return NextResponse.json({
        notes: [],
        canvases: [],
        tasks: [],
      });
    }

    interface SearchNote {
      id: string;
      title: string;
      tags: string[];
      priority: string;
      updatedAt: string | Date;
    }
    interface SearchCanvas {
      id: string;
      title: string;
      updatedAt: string | Date;
    }
    interface SearchTask {
      id: string;
      title: string;
      status: string;
      priority: string;
      dueAt: string | Date | null;
    }

    // 1. Query Notes
    let notes: SearchNote[] = [];
    try {
      notes = await prisma.note.findMany({
        where: {
          userId,
          isArchived: false,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            { tags: { has: query } },
          ],
        },
        select: {
          id: true,
          title: true,
          tags: true,
          priority: true,
          updatedAt: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch {
      const allNotes = await getUserNotes(userId);
      notes = allNotes
        .filter(
          (n) =>
            n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query) ||
            n.tags.some((t) => t.toLowerCase().includes(query)),
        )
        .slice(0, 5)
        .map((n) => ({
          id: n.id,
          title: n.title,
          tags: n.tags,
          priority: n.priority,
          updatedAt: n.updatedAt,
        }));
    }

    // 2. Query Canvases
    let canvases: SearchCanvas[] = [];
    try {
      canvases = await prisma.canvas.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, updatedAt: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch {
      const allCanvases = await getUserCanvases(userId);
      canvases = allCanvases
        .filter(
          (c) =>
            c.title.toLowerCase().includes(query) ||
            (c.description && c.description.toLowerCase().includes(query)),
        )
        .slice(0, 5)
        .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }));
    }

    // 3. Query Tasks
    let tasks: SearchTask[] = [];
    try {
      tasks = await prisma.task.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { tags: { has: query } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueAt: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      });
    } catch {
      const allTasks = await getUserTasks(userId);
      tasks = allTasks
        .filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            (t.description && t.description.toLowerCase().includes(query)) ||
            t.tags.some((tag) => tag.toLowerCase().includes(query)),
        )
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueAt: t.dueAt,
        }));
    }

    return NextResponse.json({
      notes,
      canvases,
      tasks,
    });
  } catch (error) {
    console.error("[API /api/search Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
