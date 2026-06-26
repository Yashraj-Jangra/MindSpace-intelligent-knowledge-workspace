import { getStroke } from 'perfect-freehand';
import { VectorStroke, PointerPoint, PenSubtype } from './stylus-types';

/**
 * Returns perfect-freehand stroke options for Fountain, Ballpoint, and Pencil
 */
export function getPenFreehandOptions(
  subtype: PenSubtype,
  baseWidth: number,
  smoothingLevel: 'none' | 'mild' | 'high'
) {
  const streamline = smoothingLevel === 'high' ? 0.85 : smoothingLevel === 'mild' ? 0.5 : 0.15;

  switch (subtype) {
    case 'fountain':
      return {
        size: baseWidth * 1.8,
        thinning: 0.85, // Flex pressure + speed sensitivity
        smoothing: 0.7,
        streamline,
        start: { taper: baseWidth * 2, cap: false },
        end: { taper: baseWidth * 2, cap: false },
        simulatePressure: false,
      };

    case 'pencil':
      return {
        size: baseWidth * 1.2,
        thinning: 0.15, // Subtle graphite width variation
        smoothing: 0.45,
        streamline: 0.2,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
        simulatePressure: false,
      };

    case 'ballpoint':
    default:
      return {
        size: baseWidth * 1.2,
        thinning: 0.0, // 100% constant width all the way (pressure & speed NO effect)
        smoothing: 0.4,
        streamline: 0.1,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
        simulatePressure: false,
      };
  }
}

/**
 * Generates SVG Path string for a stroke
 */
export function getSvgPathFromPoints(
  points: PointerPoint[],
  subtype: PenSubtype,
  baseWidth: number,
  smoothing: 'none' | 'mild' | 'high'
): string {
  if (!points || points.length === 0) return '';

  // For Fountain Pen: factor in point-to-point drawing speed for velocity tapering
  const inputPoints = points.map((p, idx, arr) => {
    let speedFactor = 1.0;
    if (subtype === 'fountain' && idx > 0) {
      const prev = arr[idx - 1];
      const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
      const dt = Math.max(1, p.timeStamp - prev.timeStamp);
      const speed = dist / dt; // pixels per millisecond
      // Faster drawing speed reduces effective pressure for natural tapering
      speedFactor = Math.max(0.2, 1.0 - Math.min(0.8, speed * 0.15));
    }

    const pressure = subtype === 'ballpoint' ? 0.5 : (p.pressure > 0 ? p.pressure : 0.5) * speedFactor;
    return [p.x, p.y, pressure];
  });

  const options = getPenFreehandOptions(subtype, baseWidth, smoothing);
  const strokeOutline = getStroke(inputPoints, options);

  return getSvgPathFromStrokeOutline(strokeOutline);
}

export function getSvgPathFromStrokeOutline(outlinePoints: number[][]): string {
  if (outlinePoints.length < 2) return '';

  const d = outlinePoints.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      return `${acc} ${x0.toFixed(1)},${y0.toFixed(1)} ${(x0 + x1) / 2},${(y0 + y1) / 2}`;
    },
    `M ${outlinePoints[0][0].toFixed(1)},${outlinePoints[0][1].toFixed(1)} Q`
  );

  return `${d} Z`;
}

/**
 * Renders vector stroke onto Canvas context with exact per-pen physics
 */
export function renderStrokeOnCanvas(ctx: CanvasRenderingContext2D, stroke: VectorStroke) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();

  // 1. Ballpoint Line Styles (Solid, Dashed, Dotted)
  if (stroke.penSubtype === 'ballpoint' && (stroke.lineType === 'dashed' || stroke.lineType === 'dotted')) {
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.lineType === 'dashed') {
      ctx.setLineDash([stroke.width * 3.5, stroke.width * 2]);
    } else {
      ctx.setLineDash([stroke.width * 0.5, stroke.width * 1.8]);
    }

    if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color + '66';
      ctx.lineWidth = stroke.width * 3;
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 2. Pencil Graphite Grain Shading (Pressure dictates darkness/opacity)
  if (stroke.penSubtype === 'pencil') {
    const density = stroke.pencilDensity ?? 0.85;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;

    const svgPathData = getSvgPathFromPoints(points, 'pencil', stroke.width, stroke.smoothing);
    if (svgPathData) {
      const avgPressure = points.reduce((acc, p) => acc + (p.pressure || 0.5), 0) / points.length;
      const alpha = Math.min(1.0, Math.max(0.15, avgPressure * density));
      ctx.globalAlpha = alpha;

      try {
        const path2d = new Path2D(svgPathData);
        ctx.fill(path2d);
      } catch {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineWidth = stroke.width;
        ctx.strokeStyle = stroke.color;
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  // 3. Solid Fountain Pen & Ballpoint Pen
  const svgPathData = getSvgPathFromPoints(stroke.points, stroke.penSubtype, stroke.width, stroke.smoothing);
  if (!svgPathData) {
    ctx.restore();
    return;
  }

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color + '55'; // Translucent highlighter
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = stroke.color;
  }

  try {
    const path2d = new Path2D(svgPathData);
    ctx.fill(path2d);
  } catch {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.color;
    ctx.stroke();
  }

  ctx.restore();
}
