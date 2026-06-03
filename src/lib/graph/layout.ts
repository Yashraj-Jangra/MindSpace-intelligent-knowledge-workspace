import ELK from 'elkjs/lib/elk.bundled.js';
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

const elk = new ELK();

export async function calculateElkLayout(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  direction: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP' = 'RIGHT'
): Promise<ReactFlowNode[]> {
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.measured?.width || n.width || 280,
      height: n.measured?.height || n.height || 140,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    return nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((c) => c.id === node.id);
      return {
        ...node,
        position: {
          x: elkNode?.x || 0,
          y: elkNode?.y || 0,
        },
      };
    });
  } catch (error) {
    console.error('ELK layout error:', error);
    return nodes;
  }
}
