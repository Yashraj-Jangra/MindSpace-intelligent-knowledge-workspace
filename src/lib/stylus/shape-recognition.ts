import { PointerPoint, RecognizedShapeType, VectorStroke } from './stylus-types';

export interface RecognizedShapeResult {
  type: RecognizedShapeType;
  confidence: number;
  bounds: { x: number; y: number; width: number; height: number };
  points: PointerPoint[];
}

/**
 * Geometric shape recognizer analyzing stroke trajectory points
 */
export function recognizeShape(stroke: VectorStroke): RecognizedShapeResult | null {
  const points = stroke.points;
  if (!points || points.length < 5) return null;

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  // Bounding box calculation
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  let totalPathLength = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;

    if (i > 0) {
      const prev = points[i - 1];
      totalPathLength += Math.hypot(p.x - prev.x, p.y - prev.y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const startEndDist = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
  const isClosed = startEndDist < Math.max(25, Math.min(width, height) * 0.4);

  // 1. Check for Straight Line or Arrow (Unclosed strokes with high linearity)
  if (!isClosed && totalPathLength > 20) {
    const directDist = startEndDist;
    const linearityRatio = directDist / totalPathLength;

    if (linearityRatio > 0.88) {
      // Check if arrowhead exists at the end
      const isArrow = checkHasArrowHead(points);

      const normalizedPoints: PointerPoint[] = [
        startPoint,
        { ...endPoint, x: endPoint.x, y: endPoint.y },
      ];

      return {
        type: isArrow ? 'arrow' : 'line',
        confidence: linearityRatio,
        bounds: { x: minX, y: minY, width, height },
        points: normalizedPoints,
      };
    }
  }

  // 2. Check for Closed Shapes (Circle, Rectangle, Triangle, Diamond)
  if (isClosed) {
    const aspect = width / Math.max(1, height);

    // Corner detection (significant direction change)
    const corners = detectCorners(points);

    if (corners.length === 3) {
      // Triangle
      return {
        type: 'triangle',
        confidence: 0.85,
        bounds: { x: minX, y: minY, width, height },
        points: corners,
      };
    }

    if (corners.length === 4) {
      // Check if Diamond vs Rectangle/Square
      const isDiamond = checkIsDiamond(corners, { minX, maxX, minY, maxY });
      return {
        type: isDiamond ? 'diamond' : 'rectangle',
        confidence: 0.9,
        bounds: { x: minX, y: minY, width, height },
        points: generateCleanRectPoints(minX, minY, width, height, aspect),
      };
    }

    // Circle or Ellipse (Smooth continuous curvature without sharp corners)
    const center = { x: minX + width / 2, y: minY + height / 2 };
    const radiiVariance = calculateRadiusVariance(points, center);

    if (radiiVariance < 0.25) {
      const isSquareCircle = Math.abs(aspect - 1.0) < 0.25;
      return {
        type: isSquareCircle ? 'circle' : 'ellipse',
        confidence: 0.92,
        bounds: { x: minX, y: minY, width, height },
        points: generateCleanEllipsePoints(center, width / 2, height / 2),
      };
    }
  }

  return null;
}

function detectCorners(points: PointerPoint[]): PointerPoint[] {
  const corners: PointerPoint[] = [];
  const step = 3;

  for (let i = step; i < points.length - step; i += step) {
    const pPrev = points[i - step];
    const pCurr = points[i];
    const pNext = points[i + step];

    const v1 = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    // Acute corner threshold (> ~50 degrees turn)
    if (diff > 0.85) {
      // Ensure corner isn't too close to existing corner
      if (corners.length === 0 || Math.hypot(pCurr.x - corners[corners.length - 1].x, pCurr.y - corners[corners.length - 1].y) > 20) {
        corners.push(pCurr);
      }
    }
  }

  return corners;
}

function checkHasArrowHead(points: PointerPoint[]): boolean {
  if (points.length < 8) return false;
  const tail = points.slice(-6);
  const end = points[points.length - 1];

  let directionChanges = 0;
  for (let i = 1; i < tail.length - 1; i++) {
    const dist = Math.hypot(tail[i].x - end.x, tail[i].y - end.y);
    if (dist < 30) directionChanges++;
  }
  return directionChanges >= 2;
}

function checkIsDiamond(corners: PointerPoint[], bbox: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  const midX = (bbox.minX + bbox.maxX) / 2;
  const midY = (bbox.minY + bbox.maxY) / 2;
  let topBottomHits = 0;

  for (const c of corners) {
    if (Math.abs(c.x - midX) < (bbox.maxX - bbox.minX) * 0.25 || Math.abs(c.y - midY) < (bbox.maxY - bbox.minY) * 0.25) {
      topBottomHits++;
    }
  }
  return topBottomHits >= 3;
}

function calculateRadiusVariance(points: PointerPoint[], center: { x: number; y: number }): number {
  const distances = points.map((p) => Math.hypot(p.x - center.x, p.y - center.y));
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  const variance = distances.reduce((acc, d) => acc + Math.pow(d - avgDist, 2), 0) / distances.length;
  return Math.sqrt(variance) / (avgDist || 1);
}

function generateCleanRectPoints(x: number, y: number, w: number, h: number, aspect: number): PointerPoint[] {
  const isSquare = Math.abs(aspect - 1.0) < 0.15;
  const finalW = isSquare ? Math.max(w, h) : w;
  const finalH = isSquare ? Math.max(w, h) : h;

  return [
    { x, y, pressure: 0.5, tiltX: 0, tiltY: 0, timeStamp: 0 },
    { x: x + finalW, y, pressure: 0.5, tiltX: 0, tiltY: 0, timeStamp: 0 },
    { x: x + finalW, y: y + finalH, pressure: 0.5, tiltX: 0, tiltY: 0, timeStamp: 0 },
    { x, y: y + finalH, pressure: 0.5, tiltX: 0, tiltY: 0, timeStamp: 0 },
    { x, y, pressure: 0.5, tiltX: 0, tiltY: 0, timeStamp: 0 },
  ];
}

function generateCleanEllipsePoints(center: { x: number; y: number }, rx: number, ry: number, segments = 32): PointerPoint[] {
  const pts: PointerPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    pts.push({
      x: center.x + rx * Math.cos(theta),
      y: center.y + ry * Math.sin(theta),
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
      timeStamp: i,
    });
  }
  return pts;
}
