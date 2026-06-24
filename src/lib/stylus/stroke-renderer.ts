import { getStroke } from 'perfect-freehand';
import { VectorStroke, PointerPoint, PenSubtype, LineType, PressureCurve } from './stylus-types';

export interface PerfectFreehandOptions {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  easing: (t: number) => number;
  start: {
    taper: number;
    easing: (t: number) => number;
    cap: boolean;
  };
  end: {
    taper: number;
    easing: (t: number) => number;
    cap: boolean;
  };
  simulatePressure: boolean;
}

/**
 * Returns perfect-freehand stroke settings based on Pen Subtype and Line Thickness
 */
export function getPenFreehandOptions(
  subtype: PenSubtype,
  baseWidth: number,
  smoothingLevel: 'none' | 'mild' | 'high'
) {
  const streamline = smoothingLevel === 'high' ? 0.75 : smoothingLevel === 'mild' ? 0.45 : 0.15;

  if (subtype === 'fountain') {
    return {
      size: baseWidth * 1.8,
      thinning: 0.75, // High pressure variation
      smoothing: 0.65,
      streamline,
      start: { taper: baseWidth * 2, cap: false },
      end: { taper: baseWidth * 2, cap: false },
      simulatePressure: false,
    };
  }

  if (subtype === 'pencil') {
    return {
      size: baseWidth * 1.2,
      thinning: 0.25, // Subtle variation
      smoothing: 0.5,
      streamline,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
      simulatePressure: false,
    };
  }

  // Ballpoint Pen (Default)
  return {
    size: baseWidth * 1.4,
    thinning: 0.4,
    smoothing: 0.55,
    streamline,
    start: { taper: baseWidth * 0.8, cap: true },
    end: { taper: baseWidth * 0.8, cap: true },
    simulatePressure: false,
  };
}

/**
 * Generates an SVG Path string (d attribute) from an array of [x, y, pressure] points using perfect-freehand
 */
export function getSvgPathFromPoints(points: PointerPoint[], subtype: PenSubtype, baseWidth: number, smoothing: 'none' | 'mild' | 'high'): string {
  if (!points || points.length === 0) return '';

  const inputPoints = points.map((p) => [p.x, p.y, p.pressure > 0 ? p.pressure : 0.5]);
  const options = getPenFreehandOptions(subtype, baseWidth, smoothing);
  const strokeOutline = getStroke(inputPoints, options);

  return getSvgPathFromStrokeOutline(strokeOutline);
}

/**
 * Converts array of polygon outline points from getStroke into SVG Path data
 */
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
 * Renders stroke outline directly onto Canvas context with sub-pixel anti-aliasing
 */
export function renderStrokeOnCanvas(ctx: CanvasRenderingContext2D, stroke: VectorStroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  const svgPathData = getSvgPathFromPoints(stroke.points, stroke.penSubtype, stroke.width, stroke.smoothing);
  if (!svgPathData) return;

  ctx.save();

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color + '55'; // Translucent alpha
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;
  }

  // Use Path2D for hardware accelerated GPU polygon rendering
  try {
    const path2d = new Path2D(svgPathData);
    ctx.fill(path2d);
  } catch {
    // Fallback if Path2D unsupported
    ctx.beginPath();
    for (const p of stroke.points) {
      ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  ctx.restore();
}
