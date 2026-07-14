'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import { ConceptNode } from '../nodes/ConceptNode';
import { LayoutGrid, ShieldCheck } from 'lucide-react';
import { calculateElkLayout } from '@/lib/graph/layout';
import { MindSpaceNodeData } from '@/lib/graph/transformer';

// Stylus System Imports
import {
  VectorStroke,
  StylusTool,
  PenSubtype,
  LineType,
  StylusSettings,
  DEFAULT_STYLUS_SETTINGS,
  StylusButtonAction,
} from '@/lib/stylus/stylus-types';
import { NativeStylusCanvas } from '../editor/stylus/NativeStylusCanvas';
import { StylusDock } from '../editor/stylus/StylusDock';
import { StylusSettingsModal } from '../editor/stylus/StylusSettingsModal';
import { useStylusHardware } from '@/hooks/useStylusHardware';
import { recognizeInkToText } from '@/lib/stylus/ink-to-text';

interface MindSpaceCanvasProps {
  initialNodes?: Node<MindSpaceNodeData>[];
  initialEdges?: Edge[];
  onExpandNode?: (nodeId: string, label: string, markdown: string) => void;
  onSetReminder?: (nodeId: string, label: string) => void;
}

export function MindSpaceCanvas({
  initialNodes = [],
  initialEdges = [],
  onExpandNode,
  onSetReminder,
}: MindSpaceCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      conceptNode: ConceptNode,
    }),
    []
  );

  const enrichedNodes = useMemo(() => {
    return initialNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onExpandTopic: onExpandNode,
        onSetReminder: onSetReminder,
      },
    }));
  }, [initialNodes, onExpandNode, onSetReminder]);

  const [nodes, setNodes, onNodesChange] = useNodesState(enrichedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Stylus Canvas State
  const [isStylusOverlayActive, setIsStylusOverlayActive] = useState(true);
  const [activeTool, setActiveTool] = useState<StylusTool>('pen');
  const [activePenSubtype, setActivePenSubtype] = useState<PenSubtype>('ballpoint');
  const [activeColor, setActiveColor] = useState<string>('#FF3D00');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [lineType, setLineType] = useState<LineType>('solid');
  const [stylusSettings, setStylusSettings] = useState<StylusSettings>(DEFAULT_STYLUS_SETTINGS);
  const [strokes, setStrokes] = useState<VectorStroke[]>([]);
  const [undoStack, setUndoStack] = useState<VectorStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<VectorStroke[][]>([]);
  const [isStylusSettingsOpen, setIsStylusSettingsOpen] = useState(false);

  // Sync internal state when props change
  React.useEffect(() => {
    setNodes(enrichedNodes);
    setEdges(initialEdges);
  }, [enrichedNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: 'smoothstep', animated: true, style: { stroke: '#FF3D00', strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  // Auto-layout trigger handler
  const handleAutoLayout = async () => {
    const layoutedNodes = await calculateElkLayout(nodes, edges, 'RIGHT');
    setNodes(layoutedNodes as any);
  };

  // Undo / Redo Stacks for Canvas Ink
  const handleStrokesChange = (nextStrokes: VectorStroke[]) => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(nextStrokes);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, strokes]);
    setStrokes(previous);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes(next);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClearStrokes = () => {
    if (confirm('Clear all freehand stylus annotations on this canvas?')) {
      handleStrokesChange([]);
    }
  };

  const handleConvertInkToText = async () => {
    if (!strokes.length) return;
    const result = await recognizeInkToText(strokes);
    if (result && result.text) {
      alert(`Recognized Ink Text: "${result.text}"`);
    }
  };

  // Hardware Button Event Handler Hook
  const handleHardwareAction = useCallback(
    (action: StylusButtonAction) => {
      switch (action) {
        case 'toggle_eraser':
          setActiveTool((prev) => (prev === 'eraser' ? 'pen' : 'eraser'));
          break;
        case 'undo':
          handleUndo();
          break;
        case 'redo':
          handleRedo();
          break;
        case 'cycle_color':
          setActiveColor((prev) => (prev === '#FF3D00' ? '#FAFAFA' : prev === '#FAFAFA' ? '#4285F4' : '#FF3D00'));
          break;
        case 'clear_ink':
          handleClearStrokes();
          break;
      }
    },
    [strokes]
  );

  useStylusHardware({
    settings: stylusSettings,
    onExecuteAction: handleHardwareAction,
  });

  return (
    <div className="w-full h-full relative bg-[#0A0A0A] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#262626" />
        <Controls position="bottom-right" />
        <MiniMap nodeColor={() => '#FF3D00'} maskColor="rgba(10, 10, 10, 0.8)" />

        {/* Floating Top Control Panel */}
        <Panel position="top-right" className="flex items-center gap-3 bg-[#0F0F0F] border border-[#262626] p-2">
          <button
            onClick={() =>
              setStylusSettings((prev) => ({
                ...prev,
                isStylusModeActive: !prev.isStylusModeActive,
              }))
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-bold transition-colors ${
              stylusSettings.isStylusModeActive
                ? 'border-[#FF3D00] bg-[#FF3D00] text-[#0A0A0A]'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{stylusSettings.isStylusModeActive ? 'Stylus Mode ON' : 'Stylus Mode OFF'}</span>
          </button>

          <button
            onClick={handleAutoLayout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#FAFAFA] hover:text-[#FF3D00] border border-[#262626] hover:border-[#FF3D00] transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Auto Layout</span>
          </button>
        </Panel>
      </ReactFlow>

      {/* Freehand Stylus Overlay Canvas over React Flow */}
      <NativeStylusCanvas
        isActive={isStylusOverlayActive}
        activeTool={activeTool}
        activePenSubtype={activePenSubtype}
        activeColor={activeColor}
        strokeWidth={strokeWidth}
        lineType={lineType}
        settings={stylusSettings}
        strokes={strokes}
        onStrokesChange={handleStrokesChange}
      />

      {/* Floating Bottom Stylus Control Dock */}
      <StylusDock
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        activePenSubtype={activePenSubtype}
        onSelectPenSubtype={setActivePenSubtype}
        activeColor={activeColor}
        onChangeColor={setActiveColor}
        strokeWidth={strokeWidth}
        onChangeWidth={setStrokeWidth}
        lineType={lineType}
        onChangeLineType={setLineType}
        settings={stylusSettings}
        onToggleStylusMode={() =>
          setStylusSettings((prev) => ({
            ...prev,
            isStylusModeActive: !prev.isStylusModeActive,
          }))
        }
        onToggleAutoShape={() =>
          setStylusSettings((prev) => ({
            ...prev,
            autoShapeRecognition: !prev.autoShapeRecognition,
          }))
        }
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearStrokes}
        onConvertInkToText={handleConvertInkToText}
        onOpenSettings={() => setIsStylusSettingsOpen(true)}
      />

      {/* Hardware Settings Modal Drawer */}
      <StylusSettingsModal
        isOpen={isStylusSettingsOpen}
        onClose={() => setIsStylusSettingsOpen(false)}
        settings={stylusSettings}
        onUpdateSettings={(newSettings) =>
          setStylusSettings((prev) => ({ ...prev, ...newSettings }))
        }
      />
    </div>
  );
}
