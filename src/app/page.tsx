'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import { MindSpaceCanvas } from '@/components/canvas/MindSpaceCanvas';
import { PromptInput } from '@/components/ui/PromptInput';
import { ReminderModal } from '@/components/ui/ReminderModal';
import { NotificationToast, ToastMessage } from '@/components/ui/NotificationToast';
import { OutlineView } from '@/components/ui/OutlineView';
import { DocumentUpload } from '@/components/ui/DocumentUpload';
import { SearchBar } from '@/components/ui/SearchBar';
import { Network, FileText, FileUp, Sparkles } from 'lucide-react';

export default function Home() {
  const [nodes, setNodes] = useState<ReactFlowNode[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);
  const [canvasId, setCanvasId] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled MindSpace Map');
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals & Panels
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<{ id: string; label: string } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initial Demo Graph on mount
  useEffect(() => {
    const initialDemoNodes: ReactFlowNode[] = [
      {
        id: 'demo-1',
        type: 'conceptNode',
        position: { x: 100, y: 150 },
        data: {
          label: 'MindSpace Platform',
          markdown: 'AI-Powered Visual Note-Taking & Mind-Mapping Platform for Web Browsers.',
          type: 'CONCEPT',
          color: '#FF3D00',
        },
      },
      {
        id: 'demo-2',
        type: 'conceptNode',
        position: { x: 500, y: 50 },
        data: {
          label: 'Text Prompt-to-Graph',
          markdown: 'Paste unstructured notes or prompts to generate interconnected node maps via Vercel AI SDK.',
          type: 'TEXT_NOTE',
          color: '#3b82f6',
        },
      },
      {
        id: 'demo-3',
        type: 'conceptNode',
        position: { x: 500, y: 260 },
        data: {
          label: 'Scheduled Reminders',
          markdown: 'Set node deadline reminders with visual toast alerts and webhook event dispatches.',
          type: 'REMINDER_NODE',
          color: '#10b981',
          reminderAt: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    ];

    const initialDemoEdges: ReactFlowEdge[] = [
      {
        id: 'edge-1',
        source: 'demo-1',
        target: 'demo-2',
        label: 'Generates',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#FF3D00', strokeWidth: 2 },
      },
      {
        id: 'edge-2',
        source: 'demo-1',
        target: 'demo-3',
        label: 'Schedules',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#FF3D00', strokeWidth: 2 },
      },
    ];

    setNodes(initialDemoNodes);
    setEdges(initialDemoEdges);
  }, []);

  // Handle AI Prompt Graph Generation
  const handleGenerateGraph = async (promptText: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, canvasId }),
      });

      if (!res.ok) throw new Error('Failed to generate graph');

      const data = await res.json();
      if (data.canvasId) setCanvasId(data.canvasId);
      if (data.title) setTitle(data.title);
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
    } catch (err) {
      console.error('Error generating graph:', err);
      alert('Failed to generate mind map graph.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle AI Copilot Node Topic Expansion
  const handleExpandNode = useCallback(
    async (nodeId: string, label: string, markdown: string) => {
      try {
        const res = await fetch('/api/nodes/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canvasId, nodeId, label, markdown }),
        });

        if (!res.ok) throw new Error('Expansion failed');

        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          setNodes((prev) => [...prev, ...data.nodes]);
          setEdges((prev) => [...prev, ...data.edges]);
        }
      } catch (err) {
        console.error('Failed to expand node topic:', err);
      }
    },
    [canvasId]
  );

  // Handle AI Copilot Toolbar Actions (Summarize, Rewrite, Auto-Link)
  const handleCopilotAction = useCallback(
    async (action: 'summarize' | 'rewrite' | 'auto-link', nodeId: string, label: string, markdown?: string) => {
      try {
        const res = await fetch('/api/nodes/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, nodeId, label, markdown, canvasId }),
        });

        if (!res.ok) throw new Error('Copilot action failed');

        const data = await res.json();

        if (action === 'summarize' && data.summary) {
          setNodes((prev) =>
            prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, markdown: data.summary } } : n))
          );
        } else if (action === 'rewrite' && data.rewritten) {
          setNodes((prev) =>
            prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, markdown: data.rewritten } } : n))
          );
        } else if (action === 'auto-link' && data.newEdges) {
          setEdges((prev) => [...prev, ...data.newEdges]);
          alert(`Auto-Linked ${data.newEdges.length} new relationship connections!`);
        }
      } catch (err) {
        console.error('Copilot error:', err);
      }
    },
    [canvasId]
  );

  // Handle Node Spotlight from RAG Search
  const handleSelectSearchNode = useCallback((targetNode: { id: string; label: string; positionX: number; positionY: number }) => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: n.id === targetNode.id,
      }))
    );
  }, []);

  // Handle Document Upload Graph Generation
  const handleDocumentSuccess = (data: { canvasId: string; title: string; nodes: any[]; edges: any[] }) => {
    if (data.canvasId) setCanvasId(data.canvasId);
    if (data.title) setTitle(data.title);
    if (data.nodes) setNodes(data.nodes);
    if (data.edges) setEdges(data.edges);
  };

  // Handle Reminder Setting
  const handleOpenReminderModal = useCallback((nodeId: string, label: string) => {
    setReminderTarget({ id: nodeId, label });
  }, []);

  const handleConfirmReminder = async (nodeId: string, reminderAt: string) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                    type: 'REMINDER_NODE',
                  },
                }
              : n
          )
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
      console.error('Error scheduling reminder:', err);
    }
  };

  return (
    <main className="w-screen h-screen relative flex flex-col bg-[#0A0A0A] overflow-hidden">
      {/* Header Bar */}
      <header className="h-16 border-b border-[#262626] bg-[#0A0A0A]/90 backdrop-blur-md px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A]">
            <Network className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-sans font-extrabold text-xl tracking-tighter uppercase text-[#FAFAFA]">
              MIND<span className="text-[#FF3D00]">SPACE</span>
            </h1>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#737373] block -mt-1">
              AI VISUAL NOTE-TAKING PLATFORM
            </span>
          </div>
        </div>

        {/* Semantic RAG Search Bar & Controls */}
        <div className="flex items-center gap-3">
          <SearchBar canvasId={canvasId} onSelectNode={handleSelectSearchNode} />

          <button
            onClick={() => setIsDocUploadOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#262626] hover:border-[#FF3D00] text-xs font-mono uppercase tracking-wider text-[#FAFAFA] transition-colors"
          >
            <FileUp className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span className="hidden sm:inline">Upload Doc</span>
          </button>

          <button
            onClick={() => setIsOutlineOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#262626] hover:border-[#FF3D00] text-xs font-mono uppercase tracking-wider text-[#FAFAFA] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span className="hidden sm:inline">Outline</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative">
        <MindSpaceCanvas
          initialNodes={nodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              onCopilotAction: handleCopilotAction,
            },
          }))}
          initialEdges={edges}
          onExpandNode={handleExpandNode}
          onSetReminder={handleOpenReminderModal}
        />
      </div>

      {/* Floating Prompt Bar at Bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full px-4 flex justify-center">
        <PromptInput onGenerate={handleGenerateGraph} isLoading={isGenerating} />
      </div>

      {/* Document Upload Modal */}
      <DocumentUpload
        isOpen={isDocUploadOpen}
        onClose={() => setIsDocUploadOpen(false)}
        onUploadSuccess={handleDocumentSuccess}
      />

      {/* Slide-over Document Outline Drawer */}
      <OutlineView isOpen={isOutlineOpen} nodes={nodes} onClose={() => setIsOutlineOpen(false)} />

      {/* Node Reminder Scheduling Modal */}
      <ReminderModal
        isOpen={Boolean(reminderTarget)}
        nodeId={reminderTarget?.id || null}
        nodeLabel={reminderTarget?.label || ''}
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
