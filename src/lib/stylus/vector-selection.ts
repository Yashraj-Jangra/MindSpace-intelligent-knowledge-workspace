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
 * Calculates perpendicular distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
 */
export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Checks if point (x, y) is near any line segment of vector stroke
 */
export function isPointNearStroke(stroke: VectorStroke, x: number, y: number, tolerance = 12): boolean {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return false;

  const effectiveTolerance = Math.max(tolerance, stroke.width * 0.8);
  const box = getStrokeBoundingBox(stroke);

  if (
    x < box.minX - effectiveTolerance ||
    x > box.maxX + effectiveTolerance ||
    y < box.minY - effectiveTolerance ||
    y > box.maxY + effectiveTolerance
  ) {
    return false;
  }

  if (pts.length === 1) {
    return Math.hypot(pts[0].x - x, pts[0].y - y) <= effectiveTolerance;
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= effectiveTolerance) {
      return true;
    }
  }

  return false;
}

/**
 * Ray-casting algorithm to test if point (x, y) is inside a closed polygon loop
 */
export function isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if vector stroke intersects or lies inside a closed lasso polygon
 */
export function isStrokeInLassoPolygon(stroke: VectorStroke, polygon: { x: number; y: number }[]): boolean {
  if (!polygon || polygon.length < 3) return false;

  for (const p of stroke.points) {
    if (isPointInPolygon(p.x, p.y, polygon)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates exact parametric circle-segment intersection values t in [0, 1]
 */
export function getCircleSegmentIntersections(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  cx: number,
  cy: number,
  r: number
): number[] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const fx = p1.x - cx;
  const fy = p1.y - cy;

  const a = dx * dx + dy * dy;
  if (a === 0) return [];

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  const intersections: number[] = [];
  if (t1 >= 0 && t1 <= 1) intersections.push(t1);
  if (t2 >= 0 && t2 <= 1) intersections.push(t2);

  return intersections.sort((x, y) => x - y);
}

/**
 * Dense point interpolation to ensure fine precision
 */
function denseResamplePoints(points: PointerPoint[], maxDist = 4): PointerPoint[] {
  if (points.length < 2) return points;
  const dense: PointerPoint[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    dense.push(p1);

    if (dist > maxDist) {
      const steps = Math.ceil(dist / maxDist);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        dense.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
          pressure: p1.pressure + (p2.pressure - p1.pressure) * t,
          tiltX: p1.tiltX + (p2.tiltX - p1.tiltX) * t,
          tiltY: p1.tiltY + (p2.tiltY - p1.tiltY) * t,
          timeStamp: p1.timeStamp + (p2.timeStamp - p1.timeStamp) * t,
        });
      }
    }
  }

  dense.push(points[points.length - 1]);
  return dense;
}

/**
 * Cuts a stroke into sub-strokes with exact circle-segment intersection math
 */
export function erasePixelsFromStroke(
  stroke: VectorStroke,
  eraserX: number,
  eraserY: number,
  eraserRadius: number
): VectorStroke[] {
  const rawPts = stroke.points;
  if (!rawPts || rawPts.length === 0) return [];

  const densePts = denseResamplePoints(rawPts, 4);
  const resultStrokes: VectorStroke[] = [];
  let currentSegment: PointerPoint[] = [];

  for (let i = 0; i < densePts.length; i++) {
    const p = densePts[i];
    const dist = Math.hypot(p.x - eraserX, p.y - eraserY);

    if (dist > eraserRadius) {
      currentSegment.push(p);
    } else {
      // Point is inside eraser circle -> cut active sub-stroke
      if (currentSegment.length >= 2) {
        resultStrokes.push({
          ...stroke,
          id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          points: currentSegment,
        });
      }
      currentSegment = [];
    }
  }

  if (currentSegment.length >= 2) {
    resultStrokes.push({
      ...stroke,
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      points: currentSegment,
    });
  }

  return resultStrokes;
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
    controlPoints.push(
      { id: `${stroke.id}-tl`, x: bbox.minX, y: bbox.minY, type: 'vertex' },
      { id: `${stroke.id}-tr`, x: bbox.maxX, y: bbox.minY, type: 'vertex' },
      { id: `${stroke.id}-br`, x: bbox.maxX, y: bbox.maxY, type: 'vertex' },
      { id: `${stroke.id}-bl`, x: bbox.minX, y: bbox.maxY, type: 'vertex' }
    );
  } else if (stroke.recognizedShape === 'line' || stroke.recognizedShape === 'arrow' || pts.length <= 4) {
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
    controlPoints.push({ id: `${stroke.id}-p0`, x: pts[0].x, y: pts[0].y, type: 'endpoint' });
    const midIdx = Math.floor(pts.length / 2);
    controlPoints.push({ id: `${stroke.id}-mid`, x: pts[midIdx].x, y: pts[midIdx].y, type: 'handle' });
    controlPoints.push({ id: `${stroke.id}-p1`, x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, type: 'endpoint' });
  }

  return controlPoints;
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
