"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";
import Link from "next/link";
import { MindSpaceCanvas } from "@/components/canvas/MindSpaceCanvas";
import { PromptInput } from "@/components/ui/PromptInput";
import { ReminderModal } from "@/components/ui/ReminderModal";
import {
  NotificationToast,
  ToastMessage,
} from "@/components/ui/NotificationToast";
import { OutlineView } from "@/components/ui/OutlineView";
import { DocumentUpload } from "@/components/ui/DocumentUpload";
import { SearchBar } from "@/components/ui/SearchBar";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { AppHeader } from "@/components/navigation/AppHeader";
import {
  Network,
  FileText,
  FileUp,
  LogIn,
  UserPlus,
  LogOut,
  User,
  LayoutDashboard,
  Bell,
  ArrowLeft,
  ListTodo,
} from "lucide-react";
import { MindSpaceNodeData } from "@/lib/graph/transformer";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function CanvasWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [nodes, setNodes] = useState<ReactFlowNode<MindSpaceNodeData>[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);
  const [title, setTitle] = useState("Loading canvas...");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );

  // Modals & Panels
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Hook: Load canvas from API on mount
  useEffect(() => {
    const loadCanvas = async () => {
      try {
        setIsLoadingCanvas(true);
        const res = await fetch(`/api/canvas/${id}`);
        if (!res.ok) throw new Error("Failed to load canvas");
        const data = await res.json();
        if (data.canvas) {
          setTitle(data.canvas.title);
          setNodes(data.canvas.nodes || []);
          setEdges(data.canvas.edges || []);
        }
      } catch (err) {
        console.error("Error loading canvas:", err);
        setTitle("Error Loading Canvas");
      } finally {
        setIsLoadingCanvas(false);
      }
    };

    loadCanvas();
  }, [id]);

  // Hook: Auto-save canvas to API when graph changes
  useEffect(() => {
    if (isLoadingCanvas || title === "Loading canvas...") return;

    setSaveStatus("saving");
    const saveTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/canvas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            nodes: nodes.map(
              ({ id: nid, type, position, width, height, data }) => ({
                id: nid,
                type,
                position,
                width,
                height,
                data: {
                  label: data.label,
                  markdown: data.markdown,
                  type: data.type,
                  color: data.color,
                  reminderAt: data.reminderAt,
                  parentId: data.parentId,
                },
              }),
            ),
            edges: edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              label: e.label,
              animated: e.animated,
              type: e.type,
            })),
          }),
        });

        if (res.ok) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error("Failed to auto-save canvas:", err);
        setSaveStatus("error");
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [nodes, edges, title, id, isLoadingCanvas]);

  // Hook: AI Copilot Node Topic Expansion
  const handleExpandNode = useCallback(
    async (nodeId: string, label: string, markdown: string) => {
      try {
        const res = await fetch("/api/nodes/expand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvasId: id, nodeId, label, markdown }),
        });

        if (!res.ok) throw new Error("Expansion failed");

        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          setNodes((prev) => [...prev, ...data.nodes]);
          setEdges((prev) => [...prev, ...data.edges]);
        }
      } catch (err) {
        console.error("Failed to expand node topic:", err);
      }
    },
    [id],
  );

  // Hook: AI Copilot Toolbar Actions (Summarize, Rewrite, Auto-Link)
  const handleCopilotAction = useCallback(
    async (
      action: "summarize" | "rewrite" | "auto-link",
      nodeId: string,
      label: string,
      markdown?: string,
    ) => {
      try {
        const res = await fetch("/api/nodes/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            nodeId,
            label,
            markdown,
            canvasId: id,
          }),
        });

        if (!res.ok) throw new Error("Copilot action failed");

        const data = await res.json();

        if (action === "summarize" && data.summary) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? { ...n, data: { ...n.data, markdown: data.summary } }
                : n,
            ),
          );
        } else if (action === "rewrite" && data.rewritten) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? { ...n, data: { ...n.data, markdown: data.rewritten } }
                : n,
            ),
          );
        } else if (action === "auto-link" && data.newEdges) {
          setEdges((prev) => [...prev, ...data.newEdges]);
          alert(
            `Auto-Linked ${data.newEdges.length} new relationship connections!`,
          );
        }
      } catch (err) {
        console.error("Copilot error:", err);
      }
    },
    [id],
  );

  // Hook: Bi-Directional Outline Live Text Edit
  const handleUpdateNodeText = useCallback(
    (nodeId: string, label: string, markdown: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label, markdown } } : n,
        ),
      );
    },
    [],
  );

  // Hook: Node Spotlight from RAG Search
  const handleSelectSearchNode = useCallback(
    (targetNode: {
      id: string;
      label: string;
      positionX: number;
      positionY: number;
    }) => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          selected: n.id === targetNode.id,
        })),
      );
    },
    [],
  );

  // Hook: Reminder Modal Trigger
  const handleOpenReminderModal = useCallback(
    (nodeId: string, label: string) => {
      setReminderTarget({ id: nodeId, label });
    },
    [],
  );

  // Hook: Redirect to login if unauthenticated after loading finishes
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // --- EARLY RETURNS ---
  if (isLoading || isLoadingCanvas) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center font-mono text-xs uppercase tracking-widest">
        Loading Canvas...
      </div>
    );
  }

  if (!user) return null;

  // --- REGULAR HANDLERS ---
  // Handle AI Prompt Graph Generation
  const handleGenerateGraph = async (promptText: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          canvasId: id,
          userId: user.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate graph");

      const data = await res.json();
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
      if (data.title) setTitle(data.title);
    } catch (err) {
      console.error("Error generating graph:", err);
      alert("Failed to generate mind map graph.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Document Upload Graph Generation
  const handleDocumentSuccess = (data: {
    canvasId: string;
    title: string;
    nodes: any[];
    edges: any[];
  }) => {
    if (data.nodes) setNodes(data.nodes);
    if (data.edges) setEdges(data.edges);
    if (data.title) setTitle(data.title);
  };

  const handleConfirmReminder = async (nodeId: string, reminderAt: string) => {
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId,
          reminderAt,
          title: `Reminder: ${reminderTarget?.label}`,
        }),
      });

      if (res.ok) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    reminderAt,
                    type: "REMINDER_NODE",
                  },
                }
              : n,
          ),
        );

        setToasts((prev) => [
          ...prev,
          {
            id: `toast_${Date.now()}`,
            title: `Reminder Scheduled`,
            message: `Scheduled notification for "${reminderTarget?.label}" on ${new Date(reminderAt).toLocaleString()}`,
            scheduledFor: reminderAt,
          },
        ]);
      }
    } catch (err) {
      console.error("Error scheduling reminder:", err);
    }
  };

  const initialNodesWithCopilot = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onCopilotAction: handleCopilotAction,
      },
    }));
  }, [nodes, handleCopilotAction]);

  return (
    <main className="w-screen h-screen relative flex flex-col bg-[#0A0A0A] overflow-hidden">
      <AppHeader
        title={title}
        actions={
          <>
            <SearchBar canvasId={id} onSelectNode={handleSelectSearchNode} />
            <button
              onClick={() => setIsDocUploadOpen(true)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 border border-[#262626] hover:border-[#FF3D00] text-xs font-mono uppercase tracking-wider text-[#FAFAFA] transition-colors"
            >
              <FileUp className="w-3.5 h-3.5 text-[#FF3D00]" />
              <span className="hidden md:inline">Upload</span>
            </button>
            <ExportMenu title={title} nodes={nodes} edges={edges} />
          </>
        }
      />

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative">
        <MindSpaceCanvas
          initialNodes={initialNodesWithCopilot}
          initialEdges={edges}
          onExpandNode={handleExpandNode}
          onSetReminder={handleOpenReminderModal}
        />
      </div>

      {/* Floating Prompt Bar at Bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full px-4 flex justify-center">
        <PromptInput
          onGenerate={handleGenerateGraph}
          isLoading={isGenerating}
        />
      </div>

      {/* Document Upload Modal */}
      <DocumentUpload
        isOpen={isDocUploadOpen}
        onClose={() => setIsDocUploadOpen(false)}
        onUploadSuccess={handleDocumentSuccess}
      />

      {/* Bi-Directional Live Sync Document Outline Drawer */}
      <OutlineView
        isOpen={isOutlineOpen}
        nodes={nodes}
        onClose={() => setIsOutlineOpen(false)}
        onUpdateNodeText={handleUpdateNodeText}
      />

      {/* Node Reminder Scheduling Modal */}
      <ReminderModal
        isOpen={Boolean(reminderTarget)}
        nodeId={reminderTarget?.id || null}
        nodeLabel={reminderTarget?.label || ""}
        onClose={() => setReminderTarget(null)}
        onConfirm={handleConfirmReminder}
      />

      {/* Notification Toast Alert Manager */}
      <NotificationToast
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </main>
  );
}
