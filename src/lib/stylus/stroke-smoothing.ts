import { PointerPoint, PenSubtype, PressureCurve, SmoothingLevel } from './stylus-types';

export function applyPressureCurve(rawPressure: number, curve: PressureCurve): number {
  if (rawPressure <= 0) return 0.5; // Default fallback if device lacks pressure
  const clamped = Math.max(0.05, Math.min(1.0, rawPressure));

  switch (curve) {
    case 'soft':
      // High sensitivity for light pressure (Square root response)
      return Math.sqrt(clamped);
    case 'hard':
      // Requires firm pressure (Power response)
      return Math.pow(clamped, 2.2);
    case 'linear':
    default:
      return clamped;
  }
}

/**
 * Catmull-Rom Spline interpolation for smooth curve rendering between points
 */
export function interpolateCatmullRom(points: PointerPoint[], samplesPerSegment = 4): PointerPoint[] {
  if (points.length < 3) return points;

  const result: PointerPoint[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 1; t <= samplesPerSegment; t++) {
      const u = t / samplesPerSegment;
      const u2 = u * u;
      const u3 = u2 * u;

      const f0 = -0.5 * u3 + u2 - 0.5 * u;
      const f1 = 1.5 * u3 - 2.5 * u2 + 1.0;
      const f2 = -1.5 * u3 + 2.0 * u2 + 0.5 * u;
      const f3 = 0.5 * u3 - 0.5 * u2;

      const x = p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3;
      const y = p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3;
      const pressure = p0.pressure * f0 + p1.pressure * f1 + p2.pressure * f2 + p3.pressure * f3;
      const tiltX = p0.tiltX * f0 + p1.tiltX * f1 + p2.tiltX * f2 + p3.tiltX * f3;
      const tiltY = p0.tiltY * f0 + p1.tiltY * f1 + p2.tiltY * f2 + p3.tiltY * f3;

      result.push({
        x,
        y,
        pressure: Math.max(0.05, Math.min(1.0, pressure)),
        tiltX,
        tiltY,
        timeStamp: p1.timeStamp + (p2.timeStamp - p1.timeStamp) * u,
      });
    }
  }

  return result;
}

/**
 * Lazy Mouse / Spring Damper smoothing for high-stability calligraphy
 */
export function applyLazyMouseSmoothing(points: PointerPoint[], smoothing: SmoothingLevel): PointerPoint[] {
  if (smoothing === 'none' || points.length < 2) return points;

  const factor = smoothing === 'high' ? 0.35 : 0.65;
  const smoothed: PointerPoint[] = [points[0]];

  let currentX = points[0].x;
  let currentY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const target = points[i];
    currentX += (target.x - currentX) * factor;
    currentY += (target.y - currentY) * factor;

    smoothed.push({
      ...target,
      x: currentX,
      y: currentY,
    });
  }

  return smoothed;
}

/**
 * Calculates dynamic stroke rendering properties per point based on Pen Subtype (Ballpoint, Fountain, Pencil)
 */
export function getPenSubtypeStyle(
  point: PointerPoint,
  prevPoint: PointerPoint | null,
  baseWidth: number,
  subtype: PenSubtype,
  curve: PressureCurve = 'linear'
): { width: number; alpha: number; lineCap: CanvasLineCap } {
  const pressure = applyPressureCurve(point.pressure, curve);

  if (subtype === 'fountain') {
    // Calligraphy width derived from angle of movement and tilt
    let angle = 0.785; // Default 45 degrees
    if (prevPoint) {
      const dx = point.x - prevPoint.x;
      const dy = point.y - prevPoint.y;
      if (dx !== 0 || dy !== 0) {
        angle = Math.atan2(dy, dx);
      }
    }

    // Calligraphy nib orientation (45-degree nib angle)
    const nibAngle = Math.PI / 4;
    const angleDiff = Math.abs(Math.cos(angle - nibAngle));
    const width = Math.max(1, baseWidth * (0.3 + angleDiff * 1.4) * (0.6 + pressure * 0.8));

    return { width, alpha: 1.0, lineCap: 'square' };
  }

  if (subtype === 'pencil') {
    // Tilt shading: wide, soft stroke when stylus is tilted low
    const tiltMagnitude = Math.sqrt(point.tiltX * point.tiltX + point.tiltY * point.tiltY);
    const isTilted = tiltMagnitude > 25;

    const width = isTilted
      ? baseWidth * (1.5 + (tiltMagnitude / 90) * 2.0)
      : Math.max(0.5, baseWidth * (0.4 + pressure * 0.9));

    const alpha = isTilted ? 0.35 : Math.max(0.3, Math.min(0.95, 0.4 + pressure * 0.6));

    return { width, alpha, lineCap: 'round' };
  }

  // Ballpoint (Default)
  const width = Math.max(1, baseWidth * (0.7 + pressure * 0.6));
  return { width, alpha: 1.0, lineCap: 'round' };
}
