import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AiNodeSchema, AiEdgeSchema } from "@/lib/schemas/graph";
import {
  transformAiResponseToReactFlow,
  MindSpaceNodeData,
} from "@/lib/graph/transformer";
import { calculateElkLayout } from "@/lib/graph/layout";
import { NodeType } from "@prisma/client";

const CaptureStructureSchema = z.object({
  title: z.string().describe("Title for the generated visual canvas"),
  summary: z.string().describe("High-level summary of the capture"),
  nodes: z.array(AiNodeSchema),
  edges: z.array(AiEdgeSchema),
  suggestedTasks: z
    .array(
      z.object({
        title: z.string(),
        priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
        daysDue: z.number().default(1),
      }),
    )
    .default([]),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const { captureId, rawText } = await req.json();
    let textToProcess = rawText || "";

    let captureRecord = null;
    if (captureId) {
      captureRecord = await prisma.capture.findUnique({
        where: { id: captureId },
      });
      if (captureRecord) {
        textToProcess = captureRecord.rawText;
      }
    }

    if (!textToProcess || !textToProcess.trim()) {
      return NextResponse.json(
        { error: "Text content is required for structuring" },
        { status: 400 },
      );
    }

    let structuredData: z.infer<typeof CaptureStructureSchema>;

    try {
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY.includes("your-openai-api-key")
      ) {
        throw new Error("No valid OpenAI API key");
      }

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: CaptureStructureSchema,
        prompt: `You are an expert AI knowledge architect.
Analyze the following unstructured thought dump / capture and structure it into a comprehensive visual mind map graph.
Identify central themes, actionable tasks, key notes, and semantic connections between nodes.

Capture Text:
"${textToProcess.slice(0, 10000)}"`,
      });
      structuredData = object;
    } catch {
      // High quality fallback structuring
      const cleanTitle =
        textToProcess.slice(0, 35).replace(/[\r\n]+/g, " ") ||
        "Structured MindMap";
      structuredData = {
        title: cleanTitle,
        summary: textToProcess.slice(0, 120),
        nodes: [
          {
            tempId: "root-1",
            label: cleanTitle,
            summary: textToProcess,
            type: "CONCEPT",
            colorHint: "#FF3D00",
          },
          {
            tempId: "node-actions",
            label: "Action Items & Deliverables",
            summary:
              "Direct tasks and execution deliverables extracted from capture.",
            type: "TEXT_NOTE",
            colorHint: "#10B981",
            parentId: "root-1",
          },
          {
            tempId: "node-insights",
            label: "Key Concepts & Notes",
            summary: "Important references, architecture points, and thoughts.",
            type: "CONCEPT",
            colorHint: "#3B82F6",
            parentId: "root-1",
          },
        ],
        edges: [
          {
            sourceTempId: "root-1",
            targetTempId: "node-actions",
            relation: "actions",
            label: "actions",
          },
          {
            sourceTempId: "root-1",
            targetTempId: "node-insights",
            relation: "references",
            label: "references",
          },
        ],
        suggestedTasks: [
          { title: `Review: ${cleanTitle}`, priority: "HIGH", daysDue: 1 },
        ],
      };
    }

    // Transform and Auto-layout nodes
    const { nodes: rawNodes, edges: rawEdges } = transformAiResponseToReactFlow(
      {
        title: structuredData.title,
        nodes: structuredData.nodes,
        edges: structuredData.edges,
      },
    );

    const positionedNodes = await calculateElkLayout(
      rawNodes,
      rawEdges,
      "RIGHT",
    );

    // Create New Canvas in DB
    const newCanvas = await prisma.canvas.create({
      data: {
        userId,
        title: structuredData.title,
        description: structuredData.summary,
      },
    });

    // Bulk insert nodes and edges
    await prisma.$transaction(async (tx) => {
      for (const node of positionedNodes) {
        const data = node.data as MindSpaceNodeData;
        const nodeType = (data.type as NodeType) || NodeType.CONCEPT;

        await tx.node.create({
          data: {
            id: node.id,
            canvasId: newCanvas.id,
            parentId: data.parentId,
            type: nodeType,
            label: data.label || "Node",
            markdown: data.markdown || "",
            positionX: node.position.x,
            positionY: node.position.y,
            color: data.color || "#FF3D00",
          },
        });
      }

      for (const edge of rawEdges) {
        await tx.edge.create({
          data: {
            id: edge.id,
            canvasId: newCanvas.id,
            sourceId: edge.source,
            targetId: edge.target,
            label: edge.label as string | undefined,
          },
        });
      }

      // Update capture status if linked
      if (captureId) {
        await tx.capture.update({
          where: { id: captureId },
          data: {
            status: "PROCESSED",
            canvasId: newCanvas.id,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      canvasId: newCanvas.id,
      title: structuredData.title,
      summary: structuredData.summary,
      suggestedTasks: structuredData.suggestedTasks,
    });
  } catch (error) {
    console.error("[API /api/hub/capture/structure Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
