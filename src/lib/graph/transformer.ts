import { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import { AiGraphResponse } from '../schemas/graph';

export interface MindSpaceNodeData extends Record<string, unknown> {
  label: string;
  markdown?: string;
  type: 'CONCEPT' | 'TEXT_NOTE' | 'WEB_CLIP' | 'DOCUMENT' | 'REMINDER_NODE';
  color: string;
  parentId?: string;
  reminderAt?: string | null;
  isCollapsed?: boolean;
  onExpandTopic?: (nodeId: string, label: string, markdown: string) => void;
  onSetReminder?: (nodeId: string, label: string) => void;
  onCopilotAction?: (action: 'summarize' | 'rewrite' | 'auto-link', nodeId: string, label: string, markdown?: string) => void;
}

export function transformAiResponseToReactFlow(
  aiGraph: AiGraphResponse
): { nodes: ReactFlowNode<MindSpaceNodeData>[]; edges: ReactFlowEdge[] } {
  const idMap = new Map<string, string>();

  // Map temporal AI IDs to unique deterministic IDs
  aiGraph.nodes.forEach((n) => {
    idMap.set(n.tempId, `node_${crypto.randomUUID().slice(0, 8)}`);
  });

  const nodes: ReactFlowNode<MindSpaceNodeData>[] = aiGraph.nodes.map((n) => {
    const realId = idMap.get(n.tempId)!;
    return {
      id: realId,
      type: 'conceptNode',
      position: { x: 0, y: 0 }, // Position calculated by ELK Worker
      data: {
        label: n.label,
        markdown: n.summary,
        type: n.type as any,
        color: n.colorHint || '#FF3D00',
        parentId: n.parentId ? idMap.get(n.parentId) : undefined,
        reminderAt: n.reminderAt || null,
        isCollapsed: false,
      },
    };
  });

  const edges: ReactFlowEdge[] = aiGraph.edges
    .filter((e) => idMap.has(e.sourceTempId) && idMap.has(e.targetTempId))
    .map((e) => ({
      id: `edge_${crypto.randomUUID().slice(0, 8)}`,
      source: idMap.get(e.sourceTempId)!,
      target: idMap.get(e.targetTempId)!,
      label: e.label,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#FF3D00', strokeWidth: 2 },
    }));

  return { nodes, edges };
}
