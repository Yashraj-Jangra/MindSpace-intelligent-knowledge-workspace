'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  VectorStroke,
  PointerPoint,
  StylusTool,
  PenSubtype,
  LineType,
  StylusSettings,
} from '@/lib/stylus/stylus-types';
import { StylusHaptics } from '@/lib/stylus/stylus-haptics';
import {
  interpolateCatmullRom,
  applyLazyMouseSmoothing,
  getPenSubtypeStyle,
} from '@/lib/stylus/stroke-smoothing';
import { recognizeShape } from '@/lib/stylus/shape-recognition';
import {
  getStrokeBoundingBox,
  extractControlPoints,
  isPointNearStroke,
  translateStroke,
} from '@/lib/stylus/vector-selection';

interface NativeStylusCanvasProps {
  isActive: boolean;
  activeTool: StylusTool;
  activePenSubtype: PenSubtype;
  activeColor: string;
  strokeWidth: number;
  lineType: LineType;
  settings: StylusSettings;
  strokes: VectorStroke[];
  onStrokesChange: (strokes: VectorStroke[]) => void;
}

export function NativeStylusCanvas({
  isActive,
  activeTool,
  activePenSubtype,
  activeColor,
  strokeWidth,
  lineType,
  settings,
  strokes,
  onStrokesChange,
}: NativeStylusCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<PointerPoint[]>([]);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  // Resize Canvas to parent bounds & scale devicePixelRatio
  const updateCanvasBounds = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    updateCanvasBounds();
    window.addEventListener('resize', updateCanvasBounds);
    return () => window.removeEventListener('resize', updateCanvasBounds);
  }, [updateCanvasBounds]);

  // Main Canvas Render Loop
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    // 1. Render all committed vector strokes
    for (const stroke of strokes) {
      drawVectorStroke(ctx, stroke, settings);

      // If stroke is selected, render bounding box & control handles
      if (stroke.id === selectedStrokeId) {
        drawSelectionHandles(ctx, stroke);
      }
    }

    // 2. Render active in-progress stroke
    if (isDrawing && currentPoints.length > 0) {
      const activeStroke: VectorStroke = {
        id: 'active-stroke',
        tool: activeTool,
        penSubtype: activePenSubtype,
        color: activeColor,
        width: strokeWidth,
        lineType,
        smoothing: settings.smoothingLevel,
        points: currentPoints,
        createdAt: Date.now(),
      };
      drawVectorStroke(ctx, activeStroke, settings);
    }
  }, [strokes, isDrawing, currentPoints, selectedStrokeId, activeTool, activePenSubtype, activeColor, strokeWidth, lineType, settings]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Pointer Down (Stylus Writing & Touch Palm Rejection)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    // Strict Palm Rejection: If Stylus Mode active & touch input, drop or ignore stroke
    if (settings.isStylusModeActive && settings.enablePalmRejection && e.pointerType === 'touch') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const point: PointerPoint = {
      x,
      y,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      timeStamp: e.timeStamp,
    };

    StylusHaptics.trigger('strokeStart', settings);

    if (activeTool === 'select') {
      // Find clicked stroke
      const clicked = strokes.find((s) => isPointNearStroke(s, x, y));
      if (clicked) {
        setSelectedStrokeId(clicked.id);
        setDragOffset({ x, y });
        StylusHaptics.trigger('elementSelected', settings);
      } else {
        setSelectedStrokeId(null);
        setDragOffset(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      // Erase stroke hit by point
      const remaining = strokes.filter((s) => !isPointNearStroke(s, x, y, strokeWidth * 2));
      if (remaining.length !== strokes.length) {
        StylusHaptics.trigger('eraserScrub', settings);
        onStrokesChange(remaining);
      }
      return;
    }

    // Freehand stroke start
    setIsDrawing(true);
    setCurrentPoints([point]);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'select' && selectedStrokeId && dragOffset && (e.buttons === 1 || e.buttons === 2)) {
      const dx = x - dragOffset.x;
      const dy = y - dragOffset.y;

      const updated = strokes.map((s) => (s.id === selectedStrokeId ? translateStroke(s, dx, dy) : s));
      onStrokesChange(updated);
      setDragOffset({ x, y });
      return;
    }

    if (activeTool === 'eraser' && e.buttons === 1) {
      const remaining = strokes.filter((s) => !isPointNearStroke(s, x, y, strokeWidth * 2));
      if (remaining.length !== strokes.length) {
        StylusHaptics.trigger('eraserScrub', settings);
        onStrokesChange(remaining);
      }
      return;
    }

    if (!isDrawing) return;

    const point: PointerPoint = {
      x,
      y,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      timeStamp: e.timeStamp,
    };

    setCurrentPoints((prev) => [...prev, point]);
  };

  // Pointer Up (Stroke Completion & Auto Shape Recognition)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture lost
      }
    }

    if (!isDrawing || currentPoints.length === 0) {
      setIsDrawing(false);
      return;
    }

    setIsDrawing(false);

    // Apply smoothing algorithms
    let processedPoints = currentPoints;
    if (settings.smoothingLevel !== 'none') {
      processedPoints = interpolateCatmullRom(processedPoints);
      processedPoints = applyLazyMouseSmoothing(processedPoints, settings.smoothingLevel);
    }

    let newStroke: VectorStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool,
      penSubtype: activePenSubtype,
      color: activeColor,
      width: strokeWidth,
      lineType,
      smoothing: settings.smoothingLevel,
      points: processedPoints,
      createdAt: Date.now(),
    };

    // Auto-Shape Recognition Check
    if (settings.autoShapeRecognition && activeTool === 'pen') {
      const recognized = recognizeShape(newStroke);
      if (recognized && recognized.type !== 'none') {
        newStroke = {
          ...newStroke,
          recognizedShape: recognized.type,
          points: recognized.points,
          shapeBounds: recognized.bounds,
        };
        StylusHaptics.trigger('shapeSnap', settings);
      }
    }

    // Extract control points for editability
    newStroke.controlPoints = extractControlPoints(newStroke);

    onStrokesChange([...strokes, newStroke]);
    setCurrentPoints([]);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute inset-0 z-30 w-full h-full ${
        isActive ? (activeTool === 'select' ? 'cursor-grab' : 'cursor-crosshair') : 'pointer-events-none'
      }`}
      style={{ touchAction: settings.isStylusModeActive ? 'none' : 'auto' }}
    />
  );
}

/**
 * Render Vector Stroke onto HTML5 Canvas Context
 */
function drawVectorStroke(ctx: CanvasRenderingContext2D, stroke: VectorStroke, settings: StylusSettings) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.beginPath();

  // Line Type Styling (Solid, Dashed, Dotted)
  if (stroke.lineType === 'dashed') {
    ctx.setLineDash([12, 6]);
  } else if (stroke.lineType === 'dotted') {
    ctx.setLineDash([3, 6]);
  } else {
    ctx.setLineDash([]);
  }

  if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color + '66'; // Translucent
    ctx.lineWidth = stroke.width * 3.5;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  if (points.length === 1) {
    const p = points[0];
    const style = getPenSubtypeStyle(p, null, stroke.width, stroke.penSubtype, settings.pressureCurve);
    ctx.arc(p.x, p.y, style.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const style = getPenSubtypeStyle(curr, prev, stroke.width, stroke.penSubtype, settings.pressureCurve);
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.alpha;

    ctx.lineTo(curr.x, curr.y);
  }

  ctx.stroke();

  // Render Arrowhead if shape is arrow
  if (stroke.recognizedShape === 'arrow' && points.length >= 2) {
    const end = points[points.length - 1];
    const prev = points[points.length - 2];
    const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
    const arrowLength = Math.max(12, stroke.width * 3);

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle - Math.PI / 6),
      end.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLength * Math.cos(angle + Math.PI / 6),
      end.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Render selection bounding box & control point vertices
 */
function drawSelectionHandles(ctx: CanvasRenderingContext2D, stroke: VectorStroke) {
  const bbox = getStrokeBoundingBox(stroke);
  ctx.save();

  // Bounding Box
  ctx.strokeStyle = '#FF3D00';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(bbox.minX - 6, bbox.minY - 6, bbox.width + 12, bbox.height + 12);

  // Control Points
  if (stroke.controlPoints) {
    ctx.setLineDash([]);
    ctx.fillStyle = '#FAFAFA';
    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 2;

    for (const cp of stroke.controlPoints) {
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}
