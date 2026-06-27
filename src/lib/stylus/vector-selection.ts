import { VectorStroke, ControlPoint, PointerPoint } from './stylus-types';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function getStrokeBoundingBox(stroke: VectorStroke): BoundingBox {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const p of stroke.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

export function getGroupBoundingBox(strokes: VectorStroke[]): BoundingBox | null {
  if (!strokes.length) return null;

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const stroke of strokes) {
    const box = getStrokeBoundingBox(stroke);
    if (box.minX < minX) minX = box.minX;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Extracts editable geometric control handles for Circles, Triangles, Rectangles, Lines, Arrows, and Arcs
 */
export function extractControlPoints(stroke: VectorStroke): ControlPoint[] {
  const pts = stroke.points;
  if (!pts.length) return [];

  const controlPoints: ControlPoint[] = [];
  const bbox = getStrokeBoundingBox(stroke);

  if (stroke.recognizedShape === 'circle' || stroke.recognizedShape === 'ellipse') {
    const radius = stroke.shapeBounds?.radius || Math.max(bbox.width, bbox.height) / 2;
    const center = stroke.shapeBounds?.center || { x: bbox.centerX, y: bbox.centerY };

    // Center handle + Radius handle on circumference
    controlPoints.push({
      id: `${stroke.id}-center`,
      x: center.x,
      y: center.y,
      type: 'center',
    });
    controlPoints.push({
      id: `${stroke.id}-radius`,
      x: center.x + radius,
      y: center.y,
      type: 'radius',
    });
  } else if (stroke.recognizedShape === 'triangle') {
    // 3 Corner Angle Vertices
    const v = stroke.shapeBounds?.vertices || [
      { x: bbox.centerX, y: bbox.minY },
      { x: bbox.minX, y: bbox.maxY },
      { x: bbox.maxX, y: bbox.maxY },
    ];
    controlPoints.push(
      { id: `${stroke.id}-v0`, x: v[0].x, y: v[0].y, type: 'vertex' },
      { id: `${stroke.id}-v1`, x: v[1].x, y: v[1].y, type: 'vertex' },
      { id: `${stroke.id}-v2`, x: v[2].x, y: v[2].y, type: 'vertex' }
    );
  } else if (stroke.recognizedShape === 'rectangle' || stroke.recognizedShape === 'square') {
    // 4 Corner handles for rectangle
    controlPoints.push(
      { id: `${stroke.id}-tl`, x: bbox.minX, y: bbox.minY, type: 'vertex' },
      { id: `${stroke.id}-tr`, x: bbox.maxX, y: bbox.minY, type: 'vertex' },
      { id: `${stroke.id}-br`, x: bbox.maxX, y: bbox.maxY, type: 'vertex' },
      { id: `${stroke.id}-bl`, x: bbox.minX, y: bbox.maxY, type: 'vertex' }
    );
  } else if (stroke.recognizedShape === 'line' || stroke.recognizedShape === 'arrow' || pts.length <= 4) {
    // Endpoints for line or arrow
    controlPoints.push({
      id: `${stroke.id}-start`,
      x: pts[0].x,
      y: pts[0].y,
      type: 'endpoint',
    });
    controlPoints.push({
      id: `${stroke.id}-end`,
      x: pts[pts.length - 1].x,
      y: pts[pts.length - 1].y,
      type: 'endpoint',
    });
  } else {
    // Freehand stroke endpoints + midpoint handle
    controlPoints.push({ id: `${stroke.id}-p0`, x: pts[0].x, y: pts[0].y, type: 'endpoint' });
    const midIdx = Math.floor(pts.length / 2);
    controlPoints.push({ id: `${stroke.id}-mid`, x: pts[midIdx].x, y: pts[midIdx].y, type: 'handle' });
    controlPoints.push({ id: `${stroke.id}-p1`, x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, type: 'endpoint' });
  }

  return controlPoints;
}

/**
 * Point in stroke distance check for selection click / hover
 */
export function isPointNearStroke(stroke: VectorStroke, x: number, y: number, tolerance = 12): boolean {
  const box = getStrokeBoundingBox(stroke);
  if (x < box.minX - tolerance || x > box.maxX + tolerance || y < box.minY - tolerance || y > box.maxY + tolerance) {
    return false;
  }

  for (const p of stroke.points) {
    if (Math.hypot(p.x - x, p.y - y) <= Math.max(tolerance, stroke.width * 0.8)) {
      return true;
    }
  }

  return false;
}

/**
 * Translates vector stroke points by dx, dy
 */
export function translateStroke(stroke: VectorStroke, dx: number, dy: number): VectorStroke {
  const updatedPoints = stroke.points.map((p) => ({
    ...p,
    x: p.x + dx,
    y: p.y + dy,
  }));

  const updatedControlPoints = stroke.controlPoints?.map((cp) => ({
    ...cp,
    x: cp.x + dx,
    y: cp.y + dy,
  }));

  return {
    ...stroke,
    points: updatedPoints,
    controlPoints: updatedControlPoints,
  };
}

/**
 * Scales vector stroke relative to an anchor point
 */
export function scaleStroke(
  stroke: VectorStroke,
  scaleX: number,
  scaleY: number,
  originX: number,
  originY: number
): VectorStroke {
  const updatedPoints = stroke.points.map((p) => ({
    ...p,
    x: originX + (p.x - originX) * scaleX,
    y: originY + (p.y - originY) * scaleY,
  }));

  const updatedControlPoints = stroke.controlPoints?.map((cp) => ({
    ...cp,
    x: originX + (cp.x - originX) * scaleX,
    y: originY + (cp.y - originY) * scaleY,
  }));

  return {
    ...stroke,
    points: updatedPoints,
    controlPoints: updatedControlPoints,
  };
}
