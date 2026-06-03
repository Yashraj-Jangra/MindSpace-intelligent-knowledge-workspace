import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

self.onmessage = async (event) => {
  const { nodes, edges, direction = 'RIGHT' } = event.data;

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: nodes.map((n: any) => ({
      id: n.id,
      width: n.width || 280,
      height: n.height || 140,
    })),
    edges: edges.map((e: any) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    
    const positionedNodes = nodes.map((node: any) => {
      const elkNode = layoutedGraph.children?.find((c) => c.id === node.id);
      return {
        ...node,
        position: {
          x: elkNode?.x || 0,
          y: elkNode?.y || 0,
        },
      };
    });

    self.postMessage({ nodes: positionedNodes });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
