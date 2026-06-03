'use client';

import React, { useCallback, useMemo } from 'react';
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
import '@xyflow/react/dist/style.css';
import { ConceptNode } from '../nodes/ConceptNode';
import { LayoutGrid } from 'lucide-react';
import { calculateElkLayout } from '@/lib/graph/layout';
import { MindSpaceNodeData } from '@/lib/graph/transformer';

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

  return (
    <div className="w-full h-full relative bg-[#0A0A0A]">
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
            onClick={handleAutoLayout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#FAFAFA] hover:text-[#FF3D00] border border-[#262626] hover:border-[#FF3D00] transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Auto Layout</span>
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
