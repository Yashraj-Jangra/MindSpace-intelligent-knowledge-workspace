import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';
import { NodeType, EdgeType } from '@prisma/client';

export interface StoredCanvas {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  viewportX: number;
  viewportY: number;
  zoom: number;
  layoutEngine: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const CANVASES_FILE = path.join(DATA_DIR, 'canvases.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CANVASES_FILE)) {
    fs.writeFileSync(CANVASES_FILE, JSON.stringify([]), 'utf-8');
  }
}

function getLocalCanvases(): StoredCanvas[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(CANVASES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveLocalCanvas(canvas: StoredCanvas) {
  try {
    ensureDataDir();
    const canvases = getLocalCanvases();
    const existingIdx = canvases.findIndex((c) => c.id === canvas.id);
    if (existingIdx >= 0) {
      canvases[existingIdx] = canvas;
    } else {
      canvases.unshift(canvas);
    }
    fs.writeFileSync(CANVASES_FILE, JSON.stringify(canvases, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local Canvas Store Error]:', error);
  }
}

function deleteLocalCanvas(id: string) {
  try {
    ensureDataDir();
    const canvases = getLocalCanvases().filter((c) => c.id !== id);
    fs.writeFileSync(CANVASES_FILE, JSON.stringify(canvases, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Local Canvas Store Delete Error]:', error);
  }
}

// Helpers to map DB Nodes & Edges to React Flow structure
function mapDbToReactFlow(dbCanvas: any): StoredCanvas {
  const nodes = (dbCanvas.nodes || []).map((n: any) => ({
    id: n.id,
    type: 'conceptNode',
    position: { x: n.positionX, y: n.positionY },
    width: n.width,
    height: n.height,
    data: {
      label: n.label,
      markdown: n.markdown || '',
      type: n.type,
      color: n.color || '#FF3D00',
      reminderAt: n.reminderAt ? n.reminderAt.toISOString() : null,
      parentId: n.parentId || null,
    },
  }));

  const edges = (dbCanvas.edges || []).map((e: any) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    label: e.label || '',
    animated: e.animated || false,
    type: e.edgeType.toLowerCase(),
  }));

  return {
    id: dbCanvas.id,
    userId: dbCanvas.userId,
    title: dbCanvas.title,
    description: dbCanvas.description,
    isPublic: dbCanvas.isPublic,
    viewportX: dbCanvas.viewportX,
    viewportY: dbCanvas.viewportY,
    zoom: dbCanvas.zoom,
    layoutEngine: dbCanvas.layoutEngine,
    nodes,
    edges,
    createdAt: dbCanvas.createdAt.toISOString(),
    updatedAt: dbCanvas.updatedAt.toISOString(),
  };
}

export async function getUserCanvases(userId: string): Promise<Omit<StoredCanvas, 'nodes' | 'edges'>[]> {
  if (!isDbDisabled()) {
    try {
      const dbCanvases = await prisma.canvas.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      return dbCanvases.map((c) => ({
        id: c.id,
        userId: c.userId,
        title: c.title,
        description: c.description,
        isPublic: c.isPublic,
        viewportX: c.viewportX,
        viewportY: c.viewportY,
        zoom: c.zoom,
        layoutEngine: c.layoutEngine,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  const localCanvases = getLocalCanvases().filter((c) => c.userId === userId);
  return localCanvases.map(({ nodes, edges, ...rest }) => rest).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getCanvasById(id: string): Promise<StoredCanvas | null> {
  if (!isDbDisabled()) {
    try {
      const dbCanvas = await prisma.canvas.findUnique({
        where: { id },
        include: {
          nodes: true,
          edges: true,
        },
      });
      if (dbCanvas) {
        return mapDbToReactFlow(dbCanvas);
      }
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }

  const localCanvases = getLocalCanvases();
  return localCanvases.find((c) => c.id === id) || null;
}

export async function createCanvas(data: {
  userId: string;
  title?: string;
  description?: string;
  nodes?: any[];
  edges?: any[];
}): Promise<StoredCanvas> {
  const id = `canvas_${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();

  const newCanvas: StoredCanvas = {
    id,
    userId: data.userId,
    title: data.title || 'Untitled MindSpace',
    description: data.description || null,
    isPublic: false,
    viewportX: 0,
    viewportY: 0,
    zoom: 1,
    layoutEngine: 'layered',
    nodes: data.nodes || [],
    edges: data.edges || [],
    createdAt: now,
    updatedAt: now,
  };

  if (!isDbDisabled()) {
    try {
      const dbCanvas = await prisma.canvas.create({
        data: {
          id,
          userId: data.userId,
          title: newCanvas.title,
          description: newCanvas.description,
          viewportX: newCanvas.viewportX,
          viewportY: newCanvas.viewportY,
          zoom: newCanvas.zoom,
          layoutEngine: newCanvas.layoutEngine,
        },
      });

      // Insert any initial nodes / edges if passed
      if (data.nodes && data.nodes.length > 0) {
        await syncCanvasGraph(id, data.nodes, data.edges || []);
      }

      newCanvas.id = dbCanvas.id;
    } catch (error) {
      console.warn('[DB Fallback]: Creating canvas in local JSON store.', (error as Error).message);
      disableDbCircuitBreaker();
    }
  }

  saveLocalCanvas(newCanvas);
  return newCanvas;
}

export async function updateCanvas(
  id: string,
  updates: Partial<{
    title: string;
    description: string | null;
    isPublic: boolean;
    viewportX: number;
    viewportY: number;
    zoom: number;
    layoutEngine: string;
    nodes: any[];
    edges: any[];
  }>
): Promise<StoredCanvas | null> {
  const existing = await getCanvasById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedCanvas: StoredCanvas = {
    ...existing,
    ...updates,
    updatedAt: now,
  };

  if (!isDbDisabled()) {
    try {
      await prisma.canvas.update({
        where: { id },
        data: {
          title: updates.title,
          description: updates.description,
          isPublic: updates.isPublic,
          viewportX: updates.viewportX,
          viewportY: updates.viewportY,
          zoom: updates.zoom,
          layoutEngine: updates.layoutEngine,
        },
      });

      // Sync nodes and edges if passed in updates
      if (updates.nodes !== undefined || updates.edges !== undefined) {
        const nextNodes = updates.nodes ?? existing.nodes;
        const nextEdges = updates.edges ?? existing.edges;
        await syncCanvasGraph(id, nextNodes, nextEdges);
      }
    } catch (error) {
      console.warn('[DB Fallback]: Updating canvas in local JSON store.', (error as Error).message);
      disableDbCircuitBreaker();
    }
  }

  saveLocalCanvas(updatedCanvas);
  return updatedCanvas;
}

export async function removeCanvas(id: string): Promise<boolean> {
  if (!isDbDisabled()) {
    try {
      await prisma.canvas.delete({ where: { id } });
    } catch (error) {
      disableDbCircuitBreaker();
    }
  }
  deleteLocalCanvas(id);
  return true;
}

// Internal helper to transactionally synchronize DB nodes/edges with React Flow state
async function syncCanvasGraph(canvasId: string, clientNodes: any[], clientEdges: any[]) {
  // 1. Delete all current edges and nodes belonging to the canvas
  await prisma.edge.deleteMany({ where: { canvasId } });
  await prisma.node.deleteMany({ where: { canvasId } });

  // 2. Create the node rows, setting parentId to null initially to avoid ordering key errors
  for (const n of clientNodes) {
    const nodeTypeMap: Record<string, NodeType> = {
      'CONCEPT': NodeType.CONCEPT,
      'TEXT_NOTE': NodeType.TEXT_NOTE,
      'WEB_CLIP': NodeType.WEB_CLIP,
      'DOCUMENT': NodeType.DOCUMENT,
      'REMINDER_NODE': NodeType.REMINDER_NODE,
    };
    const mappedType = nodeTypeMap[n.data?.type] || NodeType.CONCEPT;

    await prisma.node.create({
      data: {
        id: n.id,
        canvasId,
        type: mappedType,
        label: n.data?.label || '',
        markdown: n.data?.markdown || '',
        positionX: n.position?.x ?? 0,
        positionY: n.position?.y ?? 0,
        width: n.width ?? 260,
        height: n.height ?? 120,
        color: n.data?.color || '#FF3D00',
        reminderAt: n.data?.reminderAt ? new Date(n.data.reminderAt) : null,
        parentId: null, // set parent null first
      },
    });
  }

  // 3. Update parentId for nodes that reference a parent
  for (const n of clientNodes) {
    if (n.data?.parentId) {
      try {
        await prisma.node.update({
          where: { id: n.id },
          data: { parentId: n.data.parentId },
        });
      } catch (e) {
        console.warn(`[Node Sync Warn]: Could not bind parentId ${n.data.parentId} to node ${n.id}`);
      }
    }
  }

  // 4. Create the edge rows
  for (const e of clientEdges) {
    const edgeTypeMap: Record<string, EdgeType> = {
      'default': EdgeType.DEFAULT,
      'smoothstep': EdgeType.SMOOTHSTEP,
      'straight': EdgeType.STRAIGHT,
      'bezier': EdgeType.BEZIER,
    };
    const mappedEdgeType = edgeTypeMap[e.type] || EdgeType.SMOOTHSTEP;

    try {
      await prisma.edge.create({
        data: {
          id: e.id,
          canvasId,
          sourceId: e.source,
          targetId: e.target,
          label: e.label || '',
          edgeType: mappedEdgeType,
          animated: e.animated || false,
        },
      });
    } catch (err) {
      console.warn(`[Edge Sync Warn]: Could not insert edge ${e.id} linking ${e.source} -> ${e.target}`);
    }
  }
}
