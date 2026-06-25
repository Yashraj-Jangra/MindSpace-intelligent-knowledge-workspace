import { getStroke } from 'perfect-freehand';
import { VectorStroke, PointerPoint, PenSubtype, PencilLeadGrade } from './stylus-types';

/**
 * Returns perfect-freehand stroke options for 5 distinct pen subtypes
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
        thinning: 0.8, // Flex-nib pressure expansion
        smoothing: 0.7,
        streamline,
        start: { taper: baseWidth * 2, cap: false },
        end: { taper: baseWidth * 2, cap: false },
        simulatePressure: false,
      };

    case 'calligraphy':
      return {
        size: baseWidth * 1.6,
        thinning: 0.0, // Calligraphy stroke width depends on direction angle, not pressure
        smoothing: 0.6,
        streamline,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
        simulatePressure: false,
      };

    case 'fineliner':
      return {
        size: baseWidth * 1.2,
        thinning: 0.0, // 100% constant, uniform technical caliber
        smoothing: 0.4,
        streamline: 0.1,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
        simulatePressure: false,
      };

    case 'pencil':
      return {
        size: baseWidth * 1.3,
        thinning: 0.2, // Low variation, textured graphite
        smoothing: 0.45,
        streamline: 0.25,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
        simulatePressure: false,
      };

    case 'ballpoint':
    default:
      return {
        size: baseWidth * 1.4,
        thinning: 0.4, // Rolling ball mild pressure variance
        smoothing: 0.55,
        streamline,
        start: { taper: baseWidth * 0.5, cap: true },
        end: { taper: baseWidth * 0.5, cap: true },
        simulatePressure: false,
      };
  }
}

/**
 * Generates SVG Path data for a given stroke
 */
export function getSvgPathFromPoints(
  points: PointerPoint[],
  subtype: PenSubtype,
  baseWidth: number,
  smoothing: 'none' | 'mild' | 'high'
): string {
  if (!points || points.length === 0) return '';

  const inputPoints = points.map((p) => [p.x, p.y, p.pressure > 0 ? p.pressure : 0.5]);
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
 * Renders stroke onto Canvas context, implementing exact per-pen physics
 */
export function renderStrokeOnCanvas(ctx: CanvasRenderingContext2D, stroke: VectorStroke) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();

  // 1. Dashed & Dotted Line rendering
  if (stroke.lineType === 'dashed' || stroke.lineType === 'dotted') {
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    if (stroke.lineType === 'dashed') {
      ctx.setLineDash([stroke.width * 3, stroke.width * 2]);
    } else {
      ctx.setLineDash([stroke.width * 0.8, stroke.width * 1.5]);
      ctx.lineCap = 'round';
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

  // 2. Calligraphy Nib Physics (Nib Angle & Directional Width)
  if (stroke.penSubtype === 'calligraphy' && points.length >= 2) {
    const nibAngleRad = ((stroke.calligraphyNibAngle || 45) * Math.PI) / 180;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const moveAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angleDiff = Math.abs(Math.cos(moveAngle - nibAngleRad));

      // Calculate chisel width: max width on perpendicular stroke, min width on parallel stroke
      const chiselWidth = Math.max(1, stroke.width * (0.25 + angleDiff * 1.5));
      ctx.lineWidth = chiselWidth;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  // 3. Solid Polygon Path rendering (Fountain, Ballpoint, Pencil, Fineliner)
  const svgPathData = getSvgPathFromPoints(stroke.points, stroke.penSubtype, stroke.width, stroke.smoothing);
  if (!svgPathData) {
    ctx.restore();
    return;
  }

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color + '55'; // Translucent highlighter
  } else if (stroke.penSubtype === 'pencil') {
    ctx.globalCompositeOperation = 'source-over';
    // Graphite lead hardness opacity grade
    const leadGrade = stroke.pencilLeadGrade || '2B';
    const alpha = leadGrade === '2B' ? 0.85 : leadGrade === 'HB' ? 0.65 : 0.45;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = stroke.color;
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
