import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AiGraphResponseSchema, AiGraphResponse } from "@/lib/schemas/graph";
import {
  transformAiResponseToReactFlow,
  MindSpaceNodeData,
} from "@/lib/graph/transformer";
import { calculateElkLayout } from "@/lib/graph/layout";
import { NodeType } from "@prisma/client";

export const BUILTIN_TEMPLATES: Record<
  string,
  { title: string; description: string; graph: AiGraphResponse }
> = {
  "system-architecture": {
    title: "Cloud Distributed System Architecture",
    description:
      "Microservices architecture with API gateway, auth, distributed cache, message queue, and database.",
    graph: {
      title: "Cloud Distributed Architecture",
      nodes: [
        {
          tempId: "client",
          label: "Client Apps (Web/Mobile)",
          summary: "Next.js web client and iOS/Android applications",
          type: "CONCEPT",
          colorHint: "#3B82F6",
        },
        {
          tempId: "gateway",
          label: "API Gateway & Reverse Proxy",
          summary: "Rate limiting, SSL termination, and routing",
          type: "CONCEPT",
          colorHint: "#FF3D00",
          parentId: "client",
        },
        {
          tempId: "auth",
          label: "Auth & Identity Service",
          summary: "JWT token signing, OAuth, and RBAC sessions",
          type: "CONCEPT",
          colorHint: "#8B5CF6",
          parentId: "gateway",
        },
        {
          tempId: "core-api",
          label: "Core Business API",
          summary: "Primary domain services and business logic",
          type: "CONCEPT",
          colorHint: "#10B981",
          parentId: "gateway",
        },
        {
          tempId: "queue",
          label: "Message Queue (Redis / BullMQ)",
          summary: "Asynchronous event dispatch and scheduled jobs",
          type: "CONCEPT",
          colorHint: "#F59E0B",
          parentId: "core-api",
        },
        {
          tempId: "db",
          label: "PostgreSQL + pgvector Database",
          summary: "Primary relational data and vector embeddings store",
          type: "DOCUMENT",
          colorHint: "#EC4899",
          parentId: "core-api",
        },
        {
          tempId: "storage",
          label: "Object Storage (MinIO / S3)",
          summary: "Document assets, media uploads, and attachments",
          type: "DOCUMENT",
          colorHint: "#6366F1",
          parentId: "core-api",
        },
      ],
      edges: [
        {
          sourceTempId: "client",
          targetTempId: "gateway",
          relation: "routes_to",
          label: "HTTPS / WSS",
        },
        {
          sourceTempId: "gateway",
          targetTempId: "auth",
          relation: "validates",
          label: "verify_token",
        },
        {
          sourceTempId: "gateway",
          targetTempId: "core-api",
          relation: "forwards_to",
          label: "REST / gRPC",
        },
        {
          sourceTempId: "core-api",
          targetTempId: "queue",
          relation: "dispatches",
          label: "background_jobs",
        },
        {
          sourceTempId: "core-api",
          targetTempId: "db",
          relation: "queries",
          label: "read/write",
        },
        {
          sourceTempId: "core-api",
          targetTempId: "storage",
          relation: "persists",
          label: "signed_upload",
        },
      ],
    },
  },
  "root-cause-analysis": {
    title: "5-Whys Root Cause Analysis",
    description:
      "Systematic incident diagnosis framework moving from symptom to fundamental root cause and prevention.",
    graph: {
      title: "Incident Root Cause Analysis",
      nodes: [
        {
          tempId: "incident",
          label: "Incident: Production Outage",
          summary: "Primary symptom: High latency and 504 gateway timeouts",
          type: "CONCEPT",
          colorHint: "#D32F2F",
        },
        {
          tempId: "why1",
          label: "Why 1: Database Connection Starvation",
          summary: "Connection pool exhausted by long-running queries",
          type: "CONCEPT",
          colorHint: "#FF3D00",
          parentId: "incident",
        },
        {
          tempId: "why2",
          label: "Why 2: Unindexed Full Table Scans",
          summary:
            "New query introduced in latest deploy without composite index",
          type: "CONCEPT",
          colorHint: "#F59E0B",
          parentId: "why1",
        },
        {
          tempId: "why3",
          label: "Why 3: Missing Query Benchmark in CI",
          summary: "PR was merged without running performance regression gate",
          type: "CONCEPT",
          colorHint: "#8B5CF6",
          parentId: "why2",
        },
        {
          tempId: "mitigation",
          label: "Action 1: Add Missing Indexes",
          summary: "Immediate hotfix: deploy composite index migration",
          type: "TEXT_NOTE",
          colorHint: "#10B981",
          parentId: "why2",
        },
        {
          tempId: "prevention",
          label: "Action 2: Enforce Query Linter in CI",
          summary:
            "Permanent mitigation: automated EXPLAIN ANALYZE checks in CI pipeline",
          type: "TEXT_NOTE",
          colorHint: "#3B82F6",
          parentId: "why3",
        },
      ],
      edges: [
        {
          sourceTempId: "incident",
          targetTempId: "why1",
          relation: "caused_by",
          label: "why?",
        },
        {
          sourceTempId: "why1",
          targetTempId: "why2",
          relation: "caused_by",
          label: "why?",
        },
        {
          sourceTempId: "why2",
          targetTempId: "why3",
          relation: "caused_by",
          label: "why?",
        },
        {
          sourceTempId: "why2",
          targetTempId: "mitigation",
          relation: "mitigates",
          label: "immediate_fix",
        },
        {
          sourceTempId: "why3",
          targetTempId: "prevention",
          relation: "prevents",
          label: "permanent_guard",
        },
      ],
    },
  },
  "sprint-planning": {
    title: "Agile Sprint Execution Board",
    description:
      "Structured sprint breakdown from high-level goal to epics, active development, and QA validation.",
    graph: {
      title: "Sprint Goal & Epics Map",
      nodes: [
        {
          tempId: "goal",
          label: "Sprint 14: Mobile Stylus Suite",
          summary:
            "Deliver ultra-low latency digital ink and multi-page notebooks",
          type: "CONCEPT",
          colorHint: "#FF3D00",
        },
        {
          tempId: "epic1",
          label: "Epic: Zero-Lag Ink Engine",
          summary: "Incremental bitmap stamping and RDP point decimation",
          type: "CONCEPT",
          colorHint: "#10B981",
          parentId: "goal",
        },
        {
          tempId: "epic2",
          label: "Epic: Tool Settings & Ruler",
          summary: "Geometric straight-edge ruler guide and nib popovers",
          type: "CONCEPT",
          colorHint: "#3B82F6",
          parentId: "goal",
        },
        {
          tempId: "epic3",
          label: "Epic: QA & Performance Benchmarks",
          summary: "60fps stress test with 10,000 continuous vector strokes",
          type: "CONCEPT",
          colorHint: "#8B5CF6",
          parentId: "goal",
        },
        {
          tempId: "task1",
          label: "Task: Implement appendStrokeToOffscreen",
          summary: "Direct GPU quadratic curve rendering",
          type: "TEXT_NOTE",
          colorHint: "#10B981",
          parentId: "epic1",
        },
        {
          tempId: "task2",
          label: "Task: StylusRulerOverlay Component",
          summary: "Angle snapping and laser alignment guides",
          type: "TEXT_NOTE",
          colorHint: "#3B82F6",
          parentId: "epic2",
        },
      ],
      edges: [
        {
          sourceTempId: "goal",
          targetTempId: "epic1",
          relation: "breaks_into",
          label: "milestone",
        },
        {
          sourceTempId: "goal",
          targetTempId: "epic2",
          relation: "breaks_into",
          label: "milestone",
        },
        {
          sourceTempId: "goal",
          targetTempId: "epic3",
          relation: "verifies_with",
          label: "quality_gate",
        },
        {
          sourceTempId: "epic1",
          targetTempId: "task1",
          relation: "executes",
          label: "deliverable",
        },
        {
          sourceTempId: "epic2",
          targetTempId: "task2",
          relation: "executes",
          label: "deliverable",
        },
      ],
    },
  },
  "product-launch": {
    title: "Go-To-Market Product Launch Plan",
    description:
      "Comprehensive product rollout covering value prop, marketing funnel, beta test, and analytics.",
    graph: {
      title: "GTM Product Launch",
      nodes: [
        {
          tempId: "launch",
          label: "Product Launch v1.0",
          summary: "Public release of MindSpace AI Workspace",
          type: "CONCEPT",
          colorHint: "#FF3D00",
        },
        {
          tempId: "marketing",
          label: "Marketing & Distribution",
          summary: "Landing page, ProductHunt, Twitter / X launch thread",
          type: "CONCEPT",
          colorHint: "#3B82F6",
          parentId: "launch",
        },
        {
          tempId: "product",
          label: "Core Product Readiness",
          summary: "Zero-lag stylus, command palette, and AI breakdowns",
          type: "CONCEPT",
          colorHint: "#10B981",
          parentId: "launch",
        },
        {
          tempId: "ops",
          label: "Infrastructure & Reliability",
          summary: "Docker compose stack, Redis rate limiters, DB backups",
          type: "CONCEPT",
          colorHint: "#8B5CF6",
          parentId: "launch",
        },
        {
          tempId: "analytics",
          label: "Success Metrics & KPI Tracking",
          summary:
            "Daily active users, canvas creation velocity, and retention",
          type: "DOCUMENT",
          colorHint: "#F59E0B",
          parentId: "marketing",
        },
      ],
      edges: [
        {
          sourceTempId: "launch",
          targetTempId: "marketing",
          relation: "requires",
          label: "GTM",
        },
        {
          sourceTempId: "launch",
          targetTempId: "product",
          relation: "builds",
          label: "features",
        },
        {
          sourceTempId: "launch",
          targetTempId: "ops",
          relation: "deploys_on",
          label: "infra",
        },
        {
          sourceTempId: "marketing",
          targetTempId: "analytics",
          relation: "measures_via",
          label: "telemetry",
        },
      ],
    },
  },
};

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.id;

    const { templateKey, prompt, canvasId } = await req.json();

    let aiGraph: AiGraphResponse;

    if (templateKey && BUILTIN_TEMPLATES[templateKey]) {
      aiGraph = BUILTIN_TEMPLATES[templateKey].graph;
    } else if (prompt && prompt.trim()) {
      try {
        if (
          !process.env.OPENAI_API_KEY ||
          process.env.OPENAI_API_KEY.includes("your-openai-api-key")
        ) {
          throw new Error("No valid OpenAI API key");
        }

        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: AiGraphResponseSchema,
          prompt: `You are an expert visual mind-mapping and systems architecture generator.
Create a rich, structured visual node graph based on the user's template request.
Include 5-8 well-connected nodes with meaningful labels, markdown descriptions, colors, and directional edges.

User Template Request:
"${prompt.trim()}"`,
        });
        aiGraph = object;
      } catch {
        // Fallback to system-architecture blueprint if AI unavailable
        aiGraph = BUILTIN_TEMPLATES["system-architecture"].graph;
        aiGraph.title = prompt.slice(0, 40) || aiGraph.title;
      }
    } else {
      return NextResponse.json(
        { error: "Either templateKey or prompt is required" },
        { status: 400 },
      );
    }

    // Transform into React Flow layouted nodes and edges
    const { nodes: rawNodes, edges: rawEdges } =
      transformAiResponseToReactFlow(aiGraph);
    const positionedNodes = await calculateElkLayout(
      rawNodes,
      rawEdges,
      "RIGHT",
    );

    let targetCanvasId = canvasId;

    if (!targetCanvasId) {
      const newCanvas = await prisma.canvas.create({
        data: {
          userId,
          title: aiGraph.title || "Template MindSpace",
          description: `Generated from template: ${aiGraph.title}`,
        },
      });
      targetCanvasId = newCanvas.id;
    }

    // Persist to DB if canvas exists
    if (targetCanvasId) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const node of positionedNodes) {
            const data = node.data as MindSpaceNodeData;
            const nodeType = (data.type as NodeType) || NodeType.CONCEPT;

            await tx.node.create({
              data: {
                id: node.id,
                canvasId: targetCanvasId,
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
                canvasId: targetCanvasId,
                sourceId: edge.source,
                targetId: edge.target,
                label: edge.label as string | undefined,
              },
            });
          }
        });
      } catch (dbErr) {
        console.warn(
          "[DB Persist Warning]: Nodes generated directly:",
          (dbErr as Error).message,
        );
      }
    }

    return NextResponse.json({
      success: true,
      canvasId: targetCanvasId,
      title: aiGraph.title,
      nodes: positionedNodes,
      edges: rawEdges,
    });
  } catch (error) {
    console.error("[API /api/ai/template Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
