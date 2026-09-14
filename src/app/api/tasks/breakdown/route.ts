import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createTask } from "@/lib/task-storage";
import { TaskPriority } from "@prisma/client";

const TaskBreakdownSchema = z.object({
  macroTitle: z.string().describe("Clear, imperative macro-level goal title"),
  macroDescription: z
    .string()
    .describe("Context, scope, and definition of done for the macro goal"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("HIGH"),
  tags: z.array(z.string()).default([]),
  subtasks: z.array(
    z.object({
      title: z.string().describe("Actionable subtask milestone"),
      description: z.string().optional(),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
      daysOffset: z
        .number()
        .describe("Suggested deadline in days from today (e.g. 1, 2, 4)")
        .default(2),
      tags: z.array(z.string()).default([]),
    }),
  ),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const { goal, importImmediately = false } = await req.json();

    if (!goal || !goal.trim()) {
      return NextResponse.json(
        { error: "Goal description is required" },
        { status: 400 },
      );
    }

    let breakdown: z.infer<typeof TaskBreakdownSchema>;

    try {
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.includes("your-openai-api-key")
      ) {
        throw new Error("No valid OpenAI API key");
      }

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: TaskBreakdownSchema,
        prompt: `You are an expert technical project manager and task decomposition specialist.
Break down the following high-level user goal into an organized Macro Task and 4 to 6 actionable, sequentially ordered Micro Subtasks.
Assign realistic priorities, due date day offsets, and tags.

Goal:
"${goal.trim()}"`,
      });
      breakdown = object;
    } catch {
      const cleanGoal = goal.trim();
      breakdown = {
        macroTitle: cleanGoal.slice(0, 60),
        macroDescription: `Comprehensive project execution plan for: ${cleanGoal}`,
        priority: "HIGH",
        tags: ["project", "ai-breakdown"],
        subtasks: [
          {
            title: `Phase 1: Requirements & Architecture Setup`,
            description:
              "Define technical specifications, data models, and system boundaries.",
            priority: "HIGH",
            daysOffset: 1,
            tags: ["planning"],
          },
          {
            title: `Phase 2: Core Implementation & Feature Build`,
            description:
              "Build primary functionality, APIs, and business logic.",
            priority: "HIGH",
            daysOffset: 3,
            tags: ["dev"],
          },
          {
            title: `Phase 3: Integration, Testing & QA`,
            description:
              "Verify edge cases, run end-to-end tests, and ensure reliability.",
            priority: "MEDIUM",
            daysOffset: 5,
            tags: ["qa"],
          },
          {
            title: `Phase 4: Final Polish & Release Deployment`,
            description:
              "Execute production deployment, documentation, and user verification.",
            priority: "MEDIUM",
            daysOffset: 7,
            tags: ["release"],
          },
        ],
      };
    }

    // If importImmediately is true, persist directly to DB/storage
    if (importImmediately) {
      const now = new Date();
      const macroDue = new Date();
      const maxOffset = Math.max(
        ...breakdown.subtasks.map((s) => s.daysOffset),
        7,
      );
      macroDue.setDate(now.getDate() + maxOffset);

      let createdMacro;
      try {
        createdMacro = await prisma.task.create({
          data: {
            userId,
            title: breakdown.macroTitle,
            description: breakdown.macroDescription,
            priority: breakdown.priority as TaskPriority,
            dueAt: macroDue,
            tags: breakdown.tags,
          },
        });

        for (const sub of breakdown.subtasks) {
          const subDue = new Date();
          subDue.setDate(now.getDate() + sub.daysOffset);

          await prisma.task.create({
            data: {
              userId,
              parentId: createdMacro.id,
              title: sub.title,
              description: sub.description || null,
              priority: sub.priority as TaskPriority,
              dueAt: subDue,
              tags: sub.tags,
            },
          });
        }
      } catch {
        // Fallback local storage
        createdMacro = await createTask({
          userId,
          title: breakdown.macroTitle,
          description: breakdown.macroDescription,
          priority: breakdown.priority,
          dueAt: macroDue.toISOString(),
          tags: breakdown.tags,
        });

        for (const sub of breakdown.subtasks) {
          const subDue = new Date();
          subDue.setDate(now.getDate() + sub.daysOffset);

          await createTask({
            userId,
            parentId: createdMacro.id,
            title: sub.title,
            description: sub.description,
            priority: sub.priority,
            dueAt: subDue.toISOString(),
            tags: sub.tags,
          });
        }
      }

      return NextResponse.json({
        success: true,
        imported: true,
        macroTaskId: createdMacro.id,
        breakdown,
      });
    }

    return NextResponse.json({
      success: true,
      imported: false,
      breakdown,
    });
  } catch (error) {
    console.error("[API /api/tasks/breakdown Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
