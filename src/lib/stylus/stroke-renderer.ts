import { getStroke } from "perfect-freehand";
import { VectorStroke, PointerPoint, PenSubtype } from "./stylus-types";

/**
 * Returns perfect-freehand stroke options for Fountain, Ballpoint, and Pencil
 */
export function getPenFreehandOptions(
  subtype: PenSubtype,
  baseWidth: number,
  smoothingLevel: "none" | "mild" | "high",
) {
  const streamline =
    smoothingLevel === "high" ? 0.85 : smoothingLevel === "mild" ? 0.5 : 0.15;

  switch (subtype) {
    case "fountain":
      return {
        size: baseWidth * 1.8,
        thinning: 0.85, // Flex pressure + speed sensitivity
        smoothing: 0.7,
        streamline,
        start: { taper: baseWidth * 2, cap: false },
        end: { taper: baseWidth * 2, cap: false },
        simulatePressure: false,
      };

    case "pencil":
      return {
        size: baseWidth * 1.4,
        thinning: 0.2, // Textured graphite stroke variation
        smoothing: 0.4,
        streamline: 0.15,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
        simulatePressure: false,
      };

    case "ballpoint":
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
 * Computes perfect-freehand outline polygon points directly
 */
export function getStrokeOutlinePoints(
  points: PointerPoint[],
  subtype: PenSubtype,
  baseWidth: number,
  smoothing: "none" | "mild" | "high",
): number[][] {
  if (!points || points.length === 0) return [];

  const pts =
    points.length === 1
      ? [
          points[0],
          { ...points[0], x: points[0].x + 0.1, y: points[0].y + 0.1 },
        ]
      : points;

  const inputPoints = pts.map((p, idx, arr) => {
    let speedFactor = 1.0;
    if (subtype === "fountain" && idx > 0) {
      const prev = arr[idx - 1];
      const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
      const dt = Math.max(1, p.timeStamp - prev.timeStamp);
      const speed = dist / dt;
      speedFactor = Math.max(0.2, 1.0 - Math.min(0.8, speed * 0.15));
    }

    const pressure =
      subtype === "ballpoint"
        ? 0.5
        : (p.pressure > 0 ? p.pressure : 0.5) * speedFactor;
    return [p.x, p.y, pressure];
  });

  const options = getPenFreehandOptions(subtype, baseWidth, smoothing);
  return getStroke(inputPoints, options);
}

/**
 * Directly renders outline points onto CanvasRenderingContext2D with zero string allocation.
 * Performs smooth quadratic bezier curves natively on the GPU context.
 */
export function renderOutlineDirectly(
  ctx: CanvasRenderingContext2D,
  outlinePoints: number[][],
) {
  const len = outlinePoints.length;
  if (len < 2) return;

  ctx.beginPath();
  ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
  for (let i = 0; i < len; i++) {
    const [x0, y0] = outlinePoints[i];
    const [x1, y1] = outlinePoints[(i + 1) % len];
    ctx.quadraticCurveTo(x0, y0, (x0 + x1) * 0.5, (y0 + y1) * 0.5);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Generates SVG Path string for a stroke
 */
export function getSvgPathFromPoints(
  points: PointerPoint[],
  subtype: PenSubtype,
  baseWidth: number,
  smoothing: "none" | "mild" | "high",
): string {
  const strokeOutline = getStrokeOutlinePoints(
    points,
    subtype,
    baseWidth,
    smoothing,
  );
  return getSvgPathFromStrokeOutline(strokeOutline);
}

export function getSvgPathFromStrokeOutline(outlinePoints: number[][]): string {
  if (outlinePoints.length < 2) return "";

  const d = outlinePoints.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      return `${acc} ${x0.toFixed(1)},${y0.toFixed(1)} ${(x0 + x1) / 2},${(y0 + y1) / 2}`;
    },
    `M ${outlinePoints[0][0].toFixed(1)},${outlinePoints[0][1].toFixed(1)} Q`,
  );

  return `${d} Z`;
}

/**
 * High-realism Pencil Graphite Stipple Engine with Layer-by-Layer Overlapping & Paper Grain Particle Scattering
 */
export function renderPencilStroke(
  ctx: CanvasRenderingContext2D,
  stroke: VectorStroke,
) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  const density = stroke.pencilDensity ?? 0.85;
  const baseRadius = Math.max(1, stroke.width / 2);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = stroke.color;

  // Interpolate trajectory points for continuous micro-particle graphite shading
  const samplePoints: { x: number; y: number; pressure: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    samplePoints.push({ x: curr.x, y: curr.y, pressure: curr.pressure || 0.5 });

    if (i < points.length - 1) {
      const next = points[i + 1];
      const dist = Math.hypot(next.x - curr.x, next.y - curr.y);
      const step = Math.max(1.5, baseRadius * 0.35);

      if (dist > step) {
        const steps = Math.floor(dist / step);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          samplePoints.push({
            x: curr.x + (next.x - curr.x) * t,
            y: curr.y + (next.y - curr.y) * t,
            pressure:
              (curr.pressure || 0.5) * (1 - t) + (next.pressure || 0.5) * t,
          });
        }
      }
    }
  }

  // Render high-frequency graphite particle clusters along trajectory (Natural layer stacking!)
  for (let i = 0; i < samplePoints.length; i++) {
    const p = samplePoints[i];
    const pressure = Math.max(0.15, p.pressure);
    const radius = baseRadius * (0.5 + pressure * 0.75);
    const particleCount = Math.floor(Math.max(4, radius * 3.5 * density));

    // Deterministic pseudo-random seed per point for crisp re-rendering
    let seed = Math.sin(p.x * 12.9898 + p.y * 78.233 + i * 43.23) * 43758.5453;
    const pseudoRandom = () => {
      seed = Math.sin(seed) * 43758.5453;
      return seed - Math.floor(seed);
    };

    for (let k = 0; k < particleCount; k++) {
      // Gaussian radial scatter for paper tooth texture
      const u1 = pseudoRandom();
      const u2 = pseudoRandom();
      const dist = Math.sqrt(-2 * Math.log(u1 || 0.001)) * radius * 0.42;
      const angle = u2 * Math.PI * 2;

      const px = p.x + Math.cos(angle) * dist;
      const py = p.y + Math.sin(angle) * dist;

      // Micro-grain particle size & alpha (Stacks naturally when drawn over same area)
      const dotRadius = 0.35 + pseudoRandom() * 0.85;
      const alpha = Math.min(
        0.65,
        (0.06 + pseudoRandom() * 0.18) * pressure * (0.6 + density * 0.7),
      );

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Renders vector stroke onto Canvas context with exact per-pen physics
 */
export function renderStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: VectorStroke,
) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();

  // 1. Translucent Neon Highlighter (Flat Chisel or Round Bullet + Straight Line Snap)
  if (stroke.tool === "highlighter") {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    const cap = stroke.highlighterSubtype === "flat" ? "butt" : "round";
    const join = stroke.highlighterSubtype === "flat" ? "miter" : "round";

    ctx.lineCap = cap;
    ctx.lineJoin = join;

    ctx.beginPath();
    if (stroke.isStraightLine || points.length <= 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 2. Ballpoint Line Styles (Solid, Dashed, Dotted)
  if (
    stroke.penSubtype === "ballpoint" &&
    (stroke.lineType === "dashed" || stroke.lineType === "dotted")
  ) {
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.lineType === "dashed") {
      ctx.setLineDash([stroke.width * 3.5, stroke.width * 2]);
    } else {
      ctx.setLineDash([stroke.width * 0.5, stroke.width * 1.8]);
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 3. High-Realism Pencil Graphite Particle Overlapping & Paper Grain
  if (stroke.penSubtype === "pencil") {
    renderPencilStroke(ctx, stroke);
    ctx.restore();
    return;
  }

  // 4. Solid Fountain Pen & Ballpoint Pen (Direct GPU Quadratic Polygon Drawing with Outline Caching)
  let outline = (stroke as any)._cachedOutline;
  if (!outline) {
    outline = getStrokeOutlinePoints(
      stroke.points,
      stroke.penSubtype,
      stroke.width,
      stroke.smoothing,
    );
    (stroke as any)._cachedOutline = outline;
  }

  if (outline && outline.length >= 2) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = stroke.color;
    renderOutlineDirectly(ctx, outline);
  } else {
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
