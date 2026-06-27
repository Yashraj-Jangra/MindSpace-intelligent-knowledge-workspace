'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  VectorStroke,
  PointerPoint,
  StylusTool,
  PenSubtype,
  LineType,
  StylusSettings,
  ControlPoint,
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

  // Live Stationary Hold Conversion Timer Refs
  const lastMoveTimeRef = useRef<number>(0);
  const lastMovePointRef = useRef<{ x: number; y: number } | null>(null);
  const hasConvertedShapeRef = useRef(false);

  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [activeHandleId, setActiveHandleId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [eraserCursorPos, setEraserCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Synchronous offscreen canvas buffer update
  const updateOffscreenBuffer = useCallback((targetStrokes?: VectorStroke[]) => {
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
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);

    offCtx.save();
    offCtx.scale(dpr, dpr);

    const strokeList = targetStrokes || strokes;
    for (const stroke of strokeList) {
      renderStrokeOnCanvas(offCtx, stroke);
    }

    offCtx.restore();
  }, [strokes]);

  // Fast, DPR-accurate animation frame render loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // 1. Clear physical canvas buffer
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw cached static strokes from offscreen buffer (1-to-1 physical pixel copy!)
    if (offscreen && offscreen.width > 0 && offscreen.height > 0) {
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    }

    // 3. Draw active in-progress stroke with exact DPR scaling
    if (isDrawingRef.current && activePointsRef.current.length > 0) {
      ctx.save();
      ctx.scale(dpr, dpr);

      const activeStroke: VectorStroke = {
        id: 'active-stroke',
        tool: activeTool,
        penSubtype: activePenSubtype,
        highlighterSubtype: settings.activeHighlighterSubtype,
        isStraightLine: activeTool === 'highlighter' ? settings.highlighterDrawStraightLines : false,
        color: activeColor,
        width: activeTool === 'highlighter' ? settings.highlighterThickness : strokeWidth,
        lineType,
        smoothing: settings.smoothingLevel,
        pencilDensity: settings.perPenSettings.pencilDensity,
        points: activePointsRef.current,
        createdAt: Date.now(),
      };
      renderStrokeOnCanvas(ctx, activeStroke);
      ctx.restore();
    }

    // 4. Draw interactive geometric handles if selected
    if (selectedStrokeId) {
      const selected = strokes.find((s) => s.id === selectedStrokeId);
      if (selected) {
        ctx.save();
        ctx.scale(dpr, dpr);
        drawSelectionHandles(ctx, selected);
        ctx.restore();
      }
    }

    // 5. Draw visible translucent eraser ring cursor overlay
    if (activeTool === 'eraser' && eraserCursorPos) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.beginPath();
      ctx.strokeStyle = '#FF3D00';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#FF3D0022';
      ctx.arc(eraserCursorPos.x, eraserCursorPos.y, settings.eraserSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [activeTool, activePenSubtype, activeColor, strokeWidth, lineType, settings, selectedStrokeId, strokes, eraserCursorPos]);

  // Update canvas dimensions on resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    updateOffscreenBuffer();
    renderFrame();
  }, [updateOffscreenBuffer, renderFrame]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Re-render when strokes array changes
  useEffect(() => {
    updateOffscreenBuffer();
    renderFrame();
  }, [strokes, updateOffscreenBuffer, renderFrame]);

  // Check Tool Scoping for Auto-Shape Conversion
  const isShapeEnabledForTool = useCallback(() => {
    if (!settings.autoShapeRecognition) return false;
    if (activeTool === 'pen' && settings.enableShapeForPen) return true;
    if (activeTool === 'highlighter' && settings.enableShapeForHighlighter) return true;
    return false;
  }, [activeTool, settings]);

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

    // Lasso Selection & Handle Dragging
    if (activeTool === 'select') {
      if (selectedStrokeId) {
        const selected = strokes.find((s) => s.id === selectedStrokeId);
        if (selected && selected.controlPoints) {
          const clickedHandle = selected.controlPoints.find(
            (cp) => Math.hypot(cp.x - x, cp.y - y) <= 12
          );
          if (clickedHandle) {
            setActiveHandleId(clickedHandle.id);
            setDragOffset({ x, y });
            return;
          }
        }
      }

      const clicked = strokes.find((s) => isPointNearStroke(s, x, y));
      if (clicked) {
        setSelectedStrokeId(clicked.id);
        setActiveHandleId(null);
        setDragOffset({ x, y });
        StylusHaptics.trigger('elementSelected', settings);
      } else {
        setSelectedStrokeId(null);
        setActiveHandleId(null);
        setDragOffset(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      setEraserCursorPos({ x, y });
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

      if (pressure >= settings.eraserPressureThreshold) {
        let remaining = strokes;

        if (settings.eraserMode === 'stroke') {
          remaining = strokes.filter((s) => {
            if (s.tool === 'pen' && !settings.erasePenStrokes) return true;
            if (s.tool === 'highlighter' && !settings.eraseHighlighterStrokes) return true;
            return !isPointNearStroke(s, x, y, settings.eraserSize);
          });
        } else if (settings.eraserMode === 'pixel') {
          remaining = strokes.map((s) => {
            if (s.tool === 'pen' && !settings.erasePenStrokes) return s;
            if (s.tool === 'highlighter' && !settings.eraseHighlighterStrokes) return s;
            const filtered = s.points.filter((p) => Math.hypot(p.x - x, p.y - y) > settings.eraserSize);
            return { ...s, points: filtered };
          }).filter((s) => s.points.length > 0);
        } else if (settings.eraserMode === 'circular') {
          remaining = strokes.filter((s) => {
            if (s.tool === 'pen' && !settings.erasePenStrokes) return true;
            if (s.tool === 'highlighter' && !settings.eraseHighlighterStrokes) return true;
            return !isPointNearStroke(s, x, y, settings.eraserSize * 1.5);
          });
        }

        if (remaining.length !== strokes.length) {
          StylusHaptics.trigger('eraserScrub', settings);
          onStrokesChange(remaining);
          updateOffscreenBuffer(remaining);
          renderFrame();
        }
      }
      return;
    }

    // Active stroke initialization
    isDrawingRef.current = true;
    activePointsRef.current = [point];
    hasConvertedShapeRef.current = false;
    lastMoveTimeRef.current = Date.now();
    lastMovePointRef.current = { x, y };

    // Start fast 120fps render loop
    const loop = () => {
      renderFrame();
      if (isDrawingRef.current) {
        animFrameIdRef.current = requestAnimationFrame(loop);
      }
    };
    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  // Pointer Move (Reads hardware coalesced events + Eraser Ring Cursor & Pressure Filter)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle Dragging for Selected Vector Shape Controls
    if (activeTool === 'select' && selectedStrokeId && (e.buttons === 1 || e.buttons === 2)) {
      if (activeHandleId && dragOffset) {
        const dx = x - dragOffset.x;
        const dy = y - dragOffset.y;

        const updated = strokes.map((s) => {
          if (s.id !== selectedStrokeId) return s;

          // Drag Circle Radius Handle
          if (s.recognizedShape === 'circle' && activeHandleId.endsWith('-radius')) {
            const bbox = getStrokeBoundingBox(s);
            const centerX = s.shapeBounds?.center?.x ?? bbox.centerX;
            const centerY = s.shapeBounds?.center?.y ?? bbox.centerY;
            const newRadius = Math.max(10, Math.hypot(x - centerX, y - centerY));
            
            const points: PointerPoint[] = [];
            const steps = 40;
            for (let i = 0; i <= steps; i++) {
              const angle = (i / steps) * Math.PI * 2;
              points.push({
                x: centerX + Math.cos(angle) * newRadius,
                y: centerY + Math.sin(angle) * newRadius,
                pressure: 0.5,
                tiltX: 0,
                tiltY: 0,
                timeStamp: Date.now(),
              });
            }
            const updatedStroke: VectorStroke = {
              ...s,
              points,
              shapeBounds: {
                x: centerX - newRadius,
                y: centerY - newRadius,
                width: newRadius * 2,
                height: newRadius * 2,
                radius: newRadius,
                center: { x: centerX, y: centerY },
              },
            };
            return { ...updatedStroke, controlPoints: extractControlPoints(updatedStroke) };
          }

          // Drag Triangle Corner Vertices
          if (s.recognizedShape === 'triangle' && activeHandleId.includes('-v')) {
            const bbox = getStrokeBoundingBox(s);
            const vIdx = parseInt(activeHandleId.split('-v')[1], 10);
            const vertices = [...(s.shapeBounds?.vertices || [
              { x: s.points[0].x, y: s.points[0].y },
              { x: s.points[Math.floor(s.points.length / 3)].x, y: s.points[Math.floor(s.points.length / 3)].y },
              { x: s.points[Math.floor((s.points.length * 2) / 3)].x, y: s.points[Math.floor((s.points.length * 2) / 3)].y },
            ])];

            vertices[vIdx] = { x, y };

            const points: PointerPoint[] = [];
            for (let i = 0; i < 3; i++) {
              const p0 = vertices[i];
              const p1 = vertices[(i + 1) % 3];
              for (let t = 0; t <= 1; t += 0.1) {
                points.push({
                  x: p0.x + (p1.x - p0.x) * t,
                  y: p0.y + (p1.y - p0.y) * t,
                  pressure: 0.5,
                  tiltX: 0,
                  tiltY: 0,
                  timeStamp: Date.now(),
                });
              }
            }
            const updatedStroke: VectorStroke = {
              ...s,
              points,
              shapeBounds: {
                x: bbox.minX,
                y: bbox.minY,
                width: bbox.width,
                height: bbox.height,
                vertices,
              },
            };
            return { ...updatedStroke, controlPoints: extractControlPoints(updatedStroke) };
          }

          return translateStroke(s, dx, dy);
        });

        onStrokesChange(updated);
        updateOffscreenBuffer(updated);
        renderFrame();
        setDragOffset({ x, y });
        return;
      }

      if (dragOffset) {
        const dx = x - dragOffset.x;
        const dy = y - dragOffset.y;
        const updated = strokes.map((s) => (s.id === selectedStrokeId ? translateStroke(s, dx, dy) : s));
        onStrokesChange(updated);
        updateOffscreenBuffer(updated);
        renderFrame();
        setDragOffset({ x, y });
        return;
      }
    }

    if (activeTool === 'eraser') {
      setEraserCursorPos({ x, y });
      renderFrame();

      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

      if (e.buttons === 1 && pressure >= settings.eraserPressureThreshold) {
        let remaining = strokes;

        if (settings.eraserMode === 'stroke') {
          remaining = strokes.filter((s) => {
            if (s.tool === 'pen' && !settings.erasePenStrokes) return true;
            if (s.tool === 'highlighter' && !settings.eraseHighlighterStrokes) return true;
            return !isPointNearStroke(s, x, y, settings.eraserSize);
          });
        } else if (settings.eraserMode === 'pixel') {
          remaining = strokes.map((s) => {
            if (s.tool === 'pen' && !settings.erasePenStrokes) return s;
            if (s.tool === 'highlighter' && !settings.eraseHighlighterStrokes) return s;
            const filtered = s.points.filter((p) => Math.hypot(p.x - x, p.y - y) > settings.eraserSize);
            return { ...s, points: filtered };
          }).filter((s) => s.points.length > 0);
        } else if (settings.eraserMode === 'circular') {
          remaining = strokes.filter((s) => {
            if (s.tool === 'pen' && !settings.erasePenStrokes) return true;
            if (s.tool === 'highlighter' && !settings.eraseHighlighterStrokes) return true;
            return !isPointNearStroke(s, x, y, settings.eraserSize * 1.5);
          });
        }

        if (remaining.length !== strokes.length) {
          StylusHaptics.trigger('eraserScrub', settings);
          onStrokesChange(remaining);
          updateOffscreenBuffer(remaining);
          renderFrame();
        }
      }
      return;
    }

    if (!isDrawingRef.current) return;

    // Read high-frequency hardware coalesced events
    const nativeEvent = e.nativeEvent as PointerEvent;
    const coalesced = typeof nativeEvent.getCoalescedEvents === 'function' ? nativeEvent.getCoalescedEvents() : [nativeEvent];

    for (const pe of coalesced) {
      const px = pe.clientX - rect.left;
      const py = pe.clientY - rect.top;
      activePointsRef.current.push({
        x: px,
        y: py,
        pressure: pe.pressure && pe.pressure > 0 ? pe.pressure : 0.5,
        tiltX: pe.tiltX || 0,
        tiltY: pe.tiltY || 0,
        timeStamp: pe.timeStamp,
      });
    }

    // LIVE STATIONARY HOLD CONVERSION TIMER CHECK
    if (isShapeEnabledForTool() && !hasConvertedShapeRef.current && activePointsRef.current.length >= 10) {
      if (lastMovePointRef.current) {
        const distMoved = Math.hypot(x - lastMovePointRef.current.x, y - lastMovePointRef.current.y);
        if (distMoved > 6) {
          lastMoveTimeRef.current = Date.now();
          lastMovePointRef.current = { x, y };
        } else if (Date.now() - lastMoveTimeRef.current >= settings.shapeHoldTimerMs) {
          const tempStroke: VectorStroke = {
            id: 'temp',
            tool: activeTool,
            penSubtype: activePenSubtype,
            color: activeColor,
            width: strokeWidth,
            lineType,
            smoothing: settings.smoothingLevel,
            points: activePointsRef.current,
            createdAt: Date.now(),
          };

          const recognized = recognizeShape(tempStroke);
          if (recognized && recognized.type !== 'none') {
            activePointsRef.current = recognized.points;
            hasConvertedShapeRef.current = true;
            StylusHaptics.trigger('shapeSnap', settings);
          }
        }
      }
    }
  };

  // Pointer Up (Stroke Completion & Immediate Canvas Refresh)
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

    const finalPoints = [...activePointsRef.current];
    activePointsRef.current = [];

    if (finalPoints.length === 0) return;

    let newStroke: VectorStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tool: activeTool,
      penSubtype: activePenSubtype,
      highlighterSubtype: settings.activeHighlighterSubtype,
      isStraightLine: activeTool === 'highlighter' ? settings.highlighterDrawStraightLines : false,
      color: activeColor,
      width: activeTool === 'highlighter' ? settings.highlighterThickness : strokeWidth,
      lineType,
      smoothing: settings.smoothingLevel,
      pencilDensity: settings.perPenSettings.pencilDensity,
      points: finalPoints,
      createdAt: Date.now(),
    };

    // Auto-Shape Recognition (If not already converted during live hold)
    if (isShapeEnabledForTool() && !hasConvertedShapeRef.current) {
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

    const nextStrokes = [...strokes, newStroke];
    onStrokesChange(nextStrokes);

    // Synchronously render new stroke into offscreen buffer & repaint canvas immediately!
    updateOffscreenBuffer(nextStrokes);
    renderFrame();
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => setEraserCursorPos(null)}
      className={`absolute inset-0 z-30 w-full h-full ${
        isActive ? (activeTool === 'select' ? 'cursor-grab' : activeTool === 'eraser' ? 'cursor-none' : 'cursor-crosshair') : 'pointer-events-none'
      }`}
      style={{ touchAction: settings.isStylusModeActive ? 'none' : 'auto' }}
    />
  );
}

/**
 * Render interactive geometric control handles for Circles, Triangles, Rectangles, Lines
 */
function drawSelectionHandles(ctx: CanvasRenderingContext2D, stroke: VectorStroke) {
  const bbox = getStrokeBoundingBox(stroke);
  ctx.save();

  // Outer Bounding Box
  ctx.strokeStyle = '#FF3D00';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(bbox.minX - 6, bbox.minY - 6, bbox.width + 12, bbox.height + 12);

  // Render Interactive Control Point Handles
  if (stroke.controlPoints) {
    ctx.setLineDash([]);

    for (const cp of stroke.controlPoints) {
      ctx.beginPath();

      if (cp.type === 'radius') {
        // Circle Radius Handle (Vermillion Accent Circle with R indicator)
        ctx.fillStyle = '#FF3D00';
        ctx.strokeStyle = '#FAFAFA';
        ctx.lineWidth = 2;
        ctx.arc(cp.x, cp.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0A0A0A';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('R', cp.x - 3, cp.y + 3);
      } else if (cp.type === 'vertex') {
        // Triangle Corner Angle Vertex Handles
        ctx.fillStyle = '#FAFAFA';
        ctx.strokeStyle = '#FF3D00';
        ctx.lineWidth = 2.5;
        ctx.arc(cp.x, cp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Standard Handles
        ctx.fillStyle = '#FAFAFA';
        ctx.strokeStyle = '#FF3D00';
        ctx.lineWidth = 2;
        ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}
