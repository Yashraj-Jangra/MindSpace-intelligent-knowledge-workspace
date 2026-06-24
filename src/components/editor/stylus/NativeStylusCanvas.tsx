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
import { recognizeShape } from '@/lib/stylus/shape-recognition';
import {
  getStrokeBoundingBox,
  extractControlPoints,
  isPointNearStroke,
  translateStroke,
} from '@/lib/stylus/vector-selection';
import { renderStrokeOnCanvas } from '@/lib/stylus/stroke-renderer';

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
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable refs for zero-lag drawing (NO React state updates on pointermove!)
  const isDrawingRef = useRef(false);
  const activePointsRef = useRef<PointerPoint[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  // Offscreen canvas buffer update (Renders committed strokes once into background cache)
  const updateOffscreenBuffer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    const offscreen = offscreenCanvasRef.current;
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;

    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const dpr = window.devicePixelRatio || 1;
    offCtx.scale(dpr, dpr);
    offCtx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Draw all static committed strokes into cache
    for (const stroke of strokes) {
      renderStrokeOnCanvas(offCtx, stroke);
    }
  }, [strokes]);

  // Update canvas dimensions on resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    updateOffscreenBuffer();
  }, [updateOffscreenBuffer]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    updateOffscreenBuffer();
  }, [strokes, updateOffscreenBuffer]);

  // Fast animation frame render loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw cached static strokes from offscreen buffer (0ms lag!)
    if (offscreen) {
      ctx.drawImage(offscreen, 0, 0, width, height);
    }

    // 2. Draw active in-progress stroke with perfect-freehand
    if (isDrawingRef.current && activePointsRef.current.length > 0) {
      const activeStroke: VectorStroke = {
        id: 'active-stroke',
        tool: activeTool,
        penSubtype: activePenSubtype,
        color: activeColor,
        width: strokeWidth,
        lineType,
        smoothing: settings.smoothingLevel,
        points: activePointsRef.current,
        createdAt: Date.now(),
      };
      renderStrokeOnCanvas(ctx, activeStroke);
    }

    // 3. Draw selection handles if selected
    if (selectedStrokeId) {
      const selected = strokes.find((s) => s.id === selectedStrokeId);
      if (selected) {
        drawSelectionHandles(ctx, selected);
      }
    }
  }, [activeTool, activePenSubtype, activeColor, strokeWidth, lineType, settings, selectedStrokeId, strokes]);

  // Pointer Down (High-frequency pointer capture & Palm Rejection)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    // Strict Palm Rejection: Filter touch pointer events when Stylus Mode active
    if (settings.isStylusModeActive && settings.enablePalmRejection && e.pointerType === 'touch') {
      return;
    }

    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }

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
      const remaining = strokes.filter((s) => !isPointNearStroke(s, x, y, strokeWidth * 2.5));
      if (remaining.length !== strokes.length) {
        StylusHaptics.trigger('eraserScrub', settings);
        onStrokesChange(remaining);
      }
      return;
    }

    // Active stroke initialization
    isDrawingRef.current = true;
    activePointsRef.current = [point];

    // Start fast 120fps render loop
    const loop = () => {
      renderFrame();
      if (isDrawingRef.current) {
        animFrameIdRef.current = requestAnimationFrame(loop);
      }
    };
    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  // Pointer Move (Reads hardware coalesced events for 240Hz sub-pixel accuracy)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (activeTool === 'select' && selectedStrokeId && dragOffset && (e.buttons === 1 || e.buttons === 2)) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - dragOffset.x;
      const dy = y - dragOffset.y;

      const updated = strokes.map((s) => (s.id === selectedStrokeId ? translateStroke(s, dx, dy) : s));
      onStrokesChange(updated);
      setDragOffset({ x, y });
      return;
    }

    if (activeTool === 'eraser' && e.buttons === 1) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const remaining = strokes.filter((s) => !isPointNearStroke(s, x, y, strokeWidth * 2.5));
      if (remaining.length !== strokes.length) {
        StylusHaptics.trigger('eraserScrub', settings);
        onStrokesChange(remaining);
      }
      return;
    }

    if (!isDrawingRef.current) return;

    // Read high-frequency hardware coalesced events if available
    const nativeEvent = e.nativeEvent as PointerEvent;
    const coalesced = typeof nativeEvent.getCoalescedEvents === 'function' ? nativeEvent.getCoalescedEvents() : [nativeEvent];

    for (const pe of coalesced) {
      const x = pe.clientX - rect.left;
      const y = pe.clientY - rect.top;
      activePointsRef.current.push({
        x,
        y,
        pressure: pe.pressure && pe.pressure > 0 ? pe.pressure : 0.5,
        tiltX: pe.tiltX || 0,
        tiltY: pe.tiltY || 0,
        timeStamp: pe.timeStamp,
      });
    }
  };

  // Pointer Up (Stroke Completion & Auto-Shape Recognition)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture release error
      }
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }

    const finalPoints = activePointsRef.current;
    activePointsRef.current = [];

    if (finalPoints.length === 0) return;

    let newStroke: VectorStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool,
      penSubtype: activePenSubtype,
      color: activeColor,
      width: strokeWidth,
      lineType,
      smoothing: settings.smoothingLevel,
      points: finalPoints,
      createdAt: Date.now(),
    };

    // Auto-Shape Recognition
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

    newStroke.controlPoints = extractControlPoints(newStroke);

    onStrokesChange([...strokes, newStroke]);
    renderFrame();
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
 * Render selection bounding box & control point handles
 */
function drawSelectionHandles(ctx: CanvasRenderingContext2D, stroke: VectorStroke) {
  const bbox = getStrokeBoundingBox(stroke);
  ctx.save();

  ctx.strokeStyle = '#FF3D00';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(bbox.minX - 6, bbox.minY - 6, bbox.width + 12, bbox.height + 12);

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
