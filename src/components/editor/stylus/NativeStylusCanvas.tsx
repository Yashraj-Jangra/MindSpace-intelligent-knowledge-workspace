'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  VectorStroke,
  PointerPoint,
  StylusTool,
  PenSubtype,
  LineType,
  StylusSettings,
  PaperTemplate,
} from '@/lib/stylus/stylus-types';
import { StylusHaptics } from '@/lib/stylus/stylus-haptics';
import { recognizeShape } from '@/lib/stylus/shape-recognition';
import {
  getStrokeBoundingBox,
  getGroupBoundingBox,
  extractControlPoints,
  isPointNearStroke,
  erasePixelsFromStroke,
  isStrokeInLassoPolygon,
  isStrokeInBoxFrame,
  translateStroke,
  scaleStroke,
  rotateStroke,
  duplicateStrokeGroup,
} from '@/lib/stylus/vector-selection';
import { renderStrokeOnCanvas } from '@/lib/stylus/stroke-renderer';
import { Copy, Trash2, FileText, RotateCw } from 'lucide-react';

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
  paperTemplate?: PaperTemplate;
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
  paperTemplate = 'blank',
}: NativeStylusCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable refs for zero-lag drawing
  const isDrawingRef = useRef(false);
  const activePointsRef = useRef<PointerPoint[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Live Stationary Hold Conversion Timer Refs
  const lastMoveTimeRef = useRef<number>(0);
  const lastMovePointRef = useRef<{ x: number; y: number } | null>(null);
  const hasConvertedShapeRef = useRef(false);

  // Multi-element Selection & Transform Handle State
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [activeHandleId, setActiveHandleId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [eraserCursorPos, setEraserCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Lasso Freehand Area Selection & Box Selection Drag State
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [boxCurrent, setBoxCurrent] = useState<{ x: number; y: number } | null>(null);

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

    // 4. Draw interactive multi-element transform bounding box & handles if selected
    if (selectedStrokeIds.length > 0) {
      const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id));
      if (selectedStrokes.length > 0) {
        ctx.save();
        ctx.scale(dpr, dpr);
        drawGroupSelectionHandles(ctx, selectedStrokes);
        ctx.restore();
      }
    }

    // 5. Draw Lasso Selection Overlay (Freehand Loop or Rectangular Box Frame)
    if (activeTool === 'select') {
      if (settings.lassoSelectionMode === 'freehand' && lassoPointsRef.current.length > 1) {
        const pts = lassoPointsRef.current;
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.beginPath();
        ctx.strokeStyle = '#FF3D00';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.fillStyle = '#FF3D0022';
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (settings.lassoSelectionMode === 'box' && boxStart && boxCurrent) {
        const minX = Math.min(boxStart.x, boxCurrent.x);
        const minY = Math.min(boxStart.y, boxCurrent.y);
        const width = Math.abs(boxCurrent.x - boxStart.x);
        const height = Math.abs(boxCurrent.y - boxStart.y);

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#FF3D00';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.fillStyle = '#FF3D0022';
        ctx.fillRect(minX, minY, width, height);
        ctx.strokeRect(minX, minY, width, height);
        ctx.restore();
      }
    }

    // 6. Draw visible translucent eraser ring or precision lasso pointer cursor overlay
    if (activeTool === 'eraser' && eraserCursorPos) {
      ctx.save();
      ctx.scale(dpr, dpr);

      if (settings.eraserMode === 'lasso') {
        const { x, y } = eraserCursorPos;
        ctx.strokeStyle = '#FF3D00';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#FF3D0033';

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#FF3D00';
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(x - 12, y); ctx.lineTo(x - 6, y);
        ctx.moveTo(x + 6, y); ctx.lineTo(x + 12, y);
        ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 6);
        ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 12);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.strokeStyle = '#FF3D00';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#FF3D0022';
        ctx.arc(eraserCursorPos.x, eraserCursorPos.y, settings.eraserSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [activeTool, activePenSubtype, activeColor, strokeWidth, lineType, settings, selectedStrokeIds, strokes, eraserCursorPos, boxStart, boxCurrent]);

  // Update canvas dimensions on resize with ResizeObserver
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(300, Math.floor(rect.width || parent.clientWidth || 800));
    const height = Math.max(300, Math.floor(rect.height || parent.clientHeight || 650));

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      updateOffscreenBuffer();
      renderFrame();
    }
  }, [updateOffscreenBuffer, renderFrame]);

  useEffect(() => {
    handleResize();
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    let observer: ResizeObserver | null = null;
    if (parent && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => handleResize());
      observer.observe(parent);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Re-render when strokes array changes
  useEffect(() => {
    updateOffscreenBuffer();
    renderFrame();
  }, [strokes, updateOffscreenBuffer, renderFrame]);

  // Clean up selection states & overlays when activeTool changes
  useEffect(() => {
    setSelectedStrokeIds([]);
    setActiveHandleId(null);
    setDragOffset(null);
    lassoPointsRef.current = [];
    setBoxStart(null);
    setBoxCurrent(null);
    isDrawingRef.current = false;
    activePointsRef.current = [];
  }, [activeTool]);

  // Check Tool Scoping for Auto-Shape Conversion
  const isShapeEnabledForTool = useCallback(() => {
    if (!settings.autoShapeRecognition) return false;
    if (activeTool === 'pen' && settings.enableShapeForPen) return true;
    if (activeTool === 'highlighter' && settings.enableShapeForHighlighter) return true;
    return false;
  }, [activeTool, settings]);

  // Helper: Filter whether stroke should be target of eraser or selection
  const isStrokeSelectable = useCallback((s: VectorStroke) => {
    if (!settings.selectDrawings && s.tool === 'pen') return false;
    if (!settings.selectDrawings && s.tool === 'highlighter') return false;
    if (!settings.selectShapes && s.recognizedShape && s.recognizedShape !== 'none') return false;
    return true;
  }, [settings]);

  const isStrokeErasable = useCallback((s: VectorStroke) => {
    if (s.tool === 'pen' && !settings.erasePenStrokes) return false;
    if (s.tool === 'highlighter' && !settings.eraseHighlighterStrokes) return false;
    return true;
  }, [settings]);

  // Quick Action: Duplicate Selected Group
  const handleDuplicateSelection = () => {
    if (!selectedStrokeIds.length) return;
    const selected = strokes.filter((s) => selectedStrokeIds.includes(s.id));
    const duplicated = duplicateStrokeGroup(selected);
    const updated = [...strokes, ...duplicated];
    onStrokesChange(updated);
    setSelectedStrokeIds(duplicated.map((d) => d.id));
    updateOffscreenBuffer(updated);
    StylusHaptics.trigger('strokeStart', settings);
  };

  // Quick Action: Delete Selected Group
  const handleDeleteSelection = () => {
    if (!selectedStrokeIds.length) return;
    const remaining = strokes.filter((s) => !selectedStrokeIds.includes(s.id));
    onStrokesChange(remaining);
    setSelectedStrokeIds([]);
    updateOffscreenBuffer(remaining);
    StylusHaptics.trigger('eraserScrub', settings);
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    // Strict Stylus-Only Mode: Finger touch bypasses drawing to scroll page smoothly!
    if (settings.stylusOnlyMode && e.pointerType === 'touch') {
      return;
    }

    // Palm Rejection: Filter secondary non-primary touches resting on screen
    if (settings.isStylusModeActive && settings.enablePalmRejection && e.isPrimary === false) {
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
      if (selectedStrokeIds.length > 0) {
        const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id));
        const groupBbox = getGroupBoundingBox(selectedStrokes);

        if (groupBbox) {
          // Check corner resize handles (tl, tr, br, bl)
          const handles = [
            { id: 'handle-tl', x: groupBbox.minX - 6, y: groupBbox.minY - 6 },
            { id: 'handle-tr', x: groupBbox.maxX + 6, y: groupBbox.minY - 6 },
            { id: 'handle-[#FF3D00]', x: groupBbox.maxX + 6, y: groupBbox.maxY + 6 },
            { id: 'handle-bl', x: groupBbox.minX - 6, y: groupBbox.maxY + 6 },
            { id: 'handle-rotate', x: groupBbox.centerX, y: groupBbox.minY - 24 },
          ];

          const clickedHandle = handles.find((h) => Math.hypot(h.x - x, h.y - y) <= 12);
          if (clickedHandle) {
            setActiveHandleId(clickedHandle.id);
            setDragOffset({ x, y });
            return;
          }

          // Check if clicking inside bounding box for drag move translation
          if (x >= groupBbox.minX && x <= groupBbox.maxX && y >= groupBbox.minY && y <= groupBbox.maxY) {
            setActiveHandleId('handle-move');
            setDragOffset({ x, y });
            return;
          }
        }
      }

      // Start new Lasso Selection
      if (settings.lassoSelectionMode === 'freehand') {
        lassoPointsRef.current = [{ x, y }];
      } else {
        setBoxStart({ x, y });
        setBoxCurrent({ x, y });
      }
      setSelectedStrokeIds([]);
      setActiveHandleId(null);
      renderFrame();
      return;
    }

    if (activeTool === 'eraser') {
      setEraserCursorPos({ x, y });

      if (settings.eraserMode === 'lasso') {
        lassoPointsRef.current = [{ x, y }];
        renderFrame();
        return;
      }

      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

      if (pressure >= settings.eraserPressureThreshold) {
        if (settings.eraserMode === 'stroke') {
          const remaining = strokes.filter((s) => {
            if (!isStrokeErasable(s)) return true;
            return !isPointNearStroke(s, x, y, settings.eraserSize);
          });
          if (remaining.length !== strokes.length) {
            StylusHaptics.trigger('eraserScrub', settings);
            onStrokesChange(remaining);
            updateOffscreenBuffer(remaining);
            renderFrame();
          }
        } else if (settings.eraserMode === 'pixel') {
          let updatedStrokes: VectorStroke[] = [];
          let hasErased = false;

          for (const s of strokes) {
            if (!isStrokeErasable(s) || !isPointNearStroke(s, x, y, settings.eraserSize)) {
              updatedStrokes.push(s);
            } else {
              hasErased = true;
              const split = erasePixelsFromStroke(s, x, y, settings.eraserSize);
              updatedStrokes.push(...split);
            }
          }

          if (hasErased) {
            StylusHaptics.trigger('eraserScrub', settings);
            onStrokesChange(updatedStrokes);
            updateOffscreenBuffer(updatedStrokes);
            renderFrame();
          }
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

    const loop = () => {
      renderFrame();
      if (isDrawingRef.current) {
        animFrameIdRef.current = requestAnimationFrame(loop);
      }
    };
    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'select') {
      if (e.buttons === 1) {
        if (selectedStrokeIds.length > 0 && activeHandleId && dragOffset) {
          const dx = x - dragOffset.x;
          const dy = y - dragOffset.y;
          const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id));
          const groupBbox = getGroupBoundingBox(selectedStrokes);

          if (groupBbox) {
            if (activeHandleId === 'handle-move') {
              const updated = strokes.map((s) => (selectedStrokeIds.includes(s.id) ? translateStroke(s, dx, dy) : s));
              onStrokesChange(updated);
              updateOffscreenBuffer(updated);
              renderFrame();
              setDragOffset({ x, y });
              return;
            }

            if (activeHandleId === 'handle-rotate') {
              const angleRad = Math.atan2(y - groupBbox.centerY, x - groupBbox.centerX) - Math.atan2(dragOffset.y - groupBbox.centerY, dragOffset.x - groupBbox.centerX);
              const updated = strokes.map((s) => (selectedStrokeIds.includes(s.id) ? rotateStroke(s, angleRad, groupBbox.centerX, groupBbox.centerY) : s));
              onStrokesChange(updated);
              updateOffscreenBuffer(updated);
              renderFrame();
              setDragOffset({ x, y });
              return;
            }

            if (activeHandleId.startsWith('handle-t') || activeHandleId.startsWith('handle-b')) {
              const scaleX = 1 + dx / (groupBbox.width || 1);
              const scaleY = 1 + dy / (groupBbox.height || 1);
              const updated = strokes.map((s) => (selectedStrokeIds.includes(s.id) ? scaleStroke(s, scaleX, scaleY, groupBbox.centerX, groupBbox.centerY) : s));
              onStrokesChange(updated);
              updateOffscreenBuffer(updated);
              renderFrame();
              setDragOffset({ x, y });
              return;
            }
          }
        }

        if (settings.lassoSelectionMode === 'freehand') {
          lassoPointsRef.current.push({ x, y });
          renderFrame();
        } else if (settings.lassoSelectionMode === 'box' && boxStart) {
          setBoxCurrent({ x, y });
          renderFrame();
        }
      }
      return;
    }

    if (activeTool === 'eraser') {
      setEraserCursorPos({ x, y });

      if (settings.eraserMode === 'lasso' && e.buttons === 1) {
        lassoPointsRef.current.push({ x, y });
        renderFrame();
        return;
      }

      renderFrame();

      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

      if (e.buttons === 1 && pressure >= settings.eraserPressureThreshold) {
        if (settings.eraserMode === 'stroke') {
          const remaining = strokes.filter((s) => {
            if (!isStrokeErasable(s)) return true;
            return !isPointNearStroke(s, x, y, settings.eraserSize);
          });
          if (remaining.length !== strokes.length) {
            StylusHaptics.trigger('eraserScrub', settings);
            onStrokesChange(remaining);
            updateOffscreenBuffer(remaining);
            renderFrame();
          }
        } else if (settings.eraserMode === 'pixel') {
          let updatedStrokes: VectorStroke[] = [];
          let hasErased = false;

          for (const s of strokes) {
            if (!isStrokeErasable(s) || !isPointNearStroke(s, x, y, settings.eraserSize)) {
              updatedStrokes.push(s);
            } else {
              hasErased = true;
              const split = erasePixelsFromStroke(s, x, y, settings.eraserSize);
              updatedStrokes.push(...split);
            }
          }

          if (hasErased) {
            StylusHaptics.trigger('eraserScrub', settings);
            onStrokesChange(updatedStrokes);
            updateOffscreenBuffer(updatedStrokes);
            renderFrame();
          }
        }
      }
      return;
    }

    if (!isDrawingRef.current) return;

    const nativeEvent = e.nativeEvent as PointerEvent;
    let coalesced = typeof nativeEvent.getCoalescedEvents === 'function' ? nativeEvent.getCoalescedEvents() : [];
    if (!coalesced || coalesced.length === 0) {
      coalesced = [nativeEvent];
    }

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

  // Pointer Up
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

    // Process Lasso Freehand or Box Selection Completion
    if (activeTool === 'select') {
      if (settings.lassoSelectionMode === 'freehand' && lassoPointsRef.current.length > 2) {
        const polygon = [...lassoPointsRef.current];
        lassoPointsRef.current = [];

        const selected = strokes.filter((s) => isStrokeSelectable(s) && isStrokeInLassoPolygon(s, polygon));
        setSelectedStrokeIds(selected.map((s) => s.id));
        if (selected.length > 0) {
          StylusHaptics.trigger('elementSelected', settings);
        }
        renderFrame();
        return;
      } else if (settings.lassoSelectionMode === 'box' && boxStart && boxCurrent) {
        const minX = Math.min(boxStart.x, boxCurrent.x);
        const minY = Math.min(boxStart.y, boxCurrent.y);
        const maxX = Math.max(boxStart.x, boxCurrent.x);
        const maxY = Math.max(boxStart.y, boxCurrent.y);

        setBoxStart(null);
        setBoxCurrent(null);

        const selected = strokes.filter((s) => isStrokeSelectable(s) && isStrokeInBoxFrame(s, minX, minY, maxX, maxY));
        setSelectedStrokeIds(selected.map((s) => s.id));
        if (selected.length > 0) {
          StylusHaptics.trigger('elementSelected', settings);
        }
        renderFrame();
        return;
      }
    }

    // Process Lasso Freehand Area Selection Erase Completion
    if (activeTool === 'eraser' && settings.eraserMode === 'lasso' && lassoPointsRef.current.length > 2) {
      const lassoPolygon = [...lassoPointsRef.current];
      lassoPointsRef.current = [];

      const remaining = strokes.filter((s) => {
        if (!isStrokeErasable(s)) return true;
        return !isStrokeInLassoPolygon(s, lassoPolygon);
      });

      if (remaining.length !== strokes.length) {
        StylusHaptics.trigger('eraserScrub', settings);
        onStrokesChange(remaining);
        updateOffscreenBuffer(remaining);
      }

      renderFrame();
      return;
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

    updateOffscreenBuffer(nextStrokes);
    renderFrame();
  };

  // Get selected bounding box for floating action bar positioning
  const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id));
  const selectionBbox = getGroupBoundingBox(selectedStrokes);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setEraserCursorPos(null);
          lassoPointsRef.current = [];
          setBoxStart(null);
          setBoxCurrent(null);
        }}
        className={`absolute inset-0 z-50 w-full h-full ${
          isActive ? (activeTool === 'select' ? 'cursor-grab' : activeTool === 'eraser' ? 'cursor-none' : 'cursor-crosshair') : 'pointer-events-none'
        }`}
        style={{ touchAction: settings.isStylusModeActive ? 'none' : 'auto' }}
      />

      {/* Floating Selection Quick Action Bar (Duplicate, Delete, OCR) */}
      {activeTool === 'select' && selectionBbox && selectedStrokeIds.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: `${selectionBbox.centerX}px`,
            top: `${Math.max(10, selectionBbox.minY - 45)}px`,
            transform: 'translateX(-50%)',
          }}
          className="z-40 flex items-center gap-1 bg-[#0A0A0A]/95 border border-[#FF3D00] p-1 shadow-2xl backdrop-blur-md font-mono text-xs text-[#FAFAFA] select-none animate-in fade-in duration-150"
        >
          <button
            onClick={handleDuplicateSelection}
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#1A1A1A] text-[#FAFAFA] transition-colors"
            title="Duplicate Selection"
          >
            <Copy className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span>Duplicate</span>
          </button>

          <div className="h-3 w-px bg-[#262626]" />

          <button
            onClick={handleDeleteSelection}
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#D32F2F] text-[#D32F2F] hover:text-[#FAFAFA] transition-colors"
            title="Delete Selection"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Render interactive multi-element geometric control handles and rotation knob
 */
function drawGroupSelectionHandles(ctx: CanvasRenderingContext2D, strokes: VectorStroke[]) {
  const bbox = getGroupBoundingBox(strokes);
  if (!bbox) return;

  ctx.save();

  // Outer Bounding Box
  ctx.strokeStyle = '#FF3D00';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(bbox.minX - 6, bbox.minY - 6, bbox.width + 12, bbox.height + 12);

  ctx.setLineDash([]);

  // 4 Corner Resize Handles
  const corners = [
    { x: bbox.minX - 6, y: bbox.minY - 6 },
    { x: bbox.maxX + 6, y: bbox.minY - 6 },
    { x: bbox.maxX + 6, y: bbox.maxY + 6 },
    { x: bbox.minX - 6, y: bbox.maxY + 6 },
  ];

  for (const c of corners) {
    ctx.beginPath();
    ctx.fillStyle = '#FAFAFA';
    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 2;
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Top Rotation Handle Stem
  ctx.beginPath();
  ctx.strokeStyle = '#FF3D00';
  ctx.lineWidth = 1.5;
  ctx.moveTo(bbox.centerX, bbox.minY - 6);
  ctx.lineTo(bbox.centerX, bbox.minY - 24);
  ctx.stroke();

  // Rotation Knob
  ctx.beginPath();
  ctx.fillStyle = '#FF3D00';
  ctx.strokeStyle = '#FAFAFA';
  ctx.lineWidth = 2;
  ctx.arc(bbox.centerX, bbox.minY - 24, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
