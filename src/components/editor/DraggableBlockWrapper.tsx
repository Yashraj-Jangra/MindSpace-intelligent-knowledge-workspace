'use client';

import React, { useState, useRef } from 'react';
import { GripVertical, Move, RotateCcw, Maximize2 } from 'lucide-react';

interface DraggableBlockWrapperProps {
  children: React.ReactNode;
  blockTitle?: string;
  initialWidth?: string | number;
  initialHeight?: string | number;
}

export function DraggableBlockWrapper({
  children,
  blockTitle = 'Draggable Block',
  initialWidth = '100%',
  initialHeight = 'auto',
}: DraggableBlockWrapperProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState<{ width: number | string; height: number | string }>({
    width: initialWidth,
    height: initialHeight,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeMode, setResizeMode] = useState<'corner' | 'right' | 'bottom' | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, startX: 0, startY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Position Drag Handlers
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Corner & Edge Resize Handlers
  const handlePointerDownResize = (e: React.PointerEvent, mode: 'corner' | 'right' | 'bottom') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeMode(mode);

    const currentWidth = containerRef.current ? containerRef.current.offsetWidth : 300;
    const currentHeight = containerRef.current ? containerRef.current.offsetHeight : 200;

    resizeStartRef.current = {
      width: currentWidth,
      height: currentHeight,
      startX: e.clientX,
      startY: e.clientY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizing || !resizeMode) return;
    const deltaX = e.clientX - resizeStartRef.current.startX;
    const deltaY = e.clientY - resizeStartRef.current.startY;

    const newWidth = Math.max(150, resizeStartRef.current.width + deltaX);
    const newHeight = Math.max(80, resizeStartRef.current.height + deltaY);

    if (resizeMode === 'corner') {
      setSize({ width: `${newWidth}px`, height: `${newHeight}px` });
    } else if (resizeMode === 'right') {
      setSize((prev) => ({ ...prev, width: `${newWidth}px` }));
    } else if (resizeMode === 'bottom') {
      setSize((prev) => ({ ...prev, height: `${newHeight}px` }));
    }
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    setResizeMode(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleReset = () => {
    setPosition({ x: 0, y: 0 });
    setSize({ width: '100%', height: 'auto' });
  };

  return (
    <div
      ref={containerRef}
      className="relative group border border-[#262626] hover:border-[#FF3D00] transition-all my-4 bg-[#0F0F0F] select-none"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: typeof size.width === 'number' ? `${size.width}px` : size.width,
        height: typeof size.height === 'number' ? `${size.height}px` : size.height,
        maxWidth: '100%',
      }}
    >
      {/* Top Free Drag Header Bar */}
      <div
        onPointerDown={handlePointerDownDrag}
        onPointerMove={handlePointerMoveDrag}
        onPointerUp={handlePointerUpDrag}
        className="h-7 bg-[#141414] border-b border-[#262626] flex items-center justify-between px-3 cursor-grab active:cursor-grabbing text-xs font-mono text-[#737373] hover:text-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-[#FF3D00]" />
          <span className="uppercase text-[10px] font-bold tracking-wider text-[#FAFAFA]">
            {blockTitle}
          </span>
          {(position.x !== 0 || position.y !== 0) && (
            <span className="text-[10px] text-[#FF3D00] bg-[#FF3D00]/10 px-1.5 py-0.5 rounded font-mono">
              Offset: {Math.round(position.x)}px, {Math.round(position.y)}px
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1 hover:text-[#FF3D00] transition-colors"
            title="Reset Position & Width"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <Move className="w-3.5 h-3.5 text-[#737373]" />
        </div>
      </div>

      {/* Children Block Content */}
      <div className="overflow-auto p-3 h-[calc(100%-28px)]">{children}</div>

      {/* Right Edge Resize Handle */}
      <div
        onPointerDown={(e) => handlePointerDownResize(e, 'right')}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute right-0 top-7 bottom-0 w-2 hover:bg-[#FF3D00]/50 cursor-e-resize z-20 group-hover:bg-[#262626]"
        title="Drag to resize width"
      />

      {/* Bottom Edge Resize Handle */}
      <div
        onPointerDown={(e) => handlePointerDownResize(e, 'bottom')}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute bottom-0 left-0 right-0 h-2 hover:bg-[#FF3D00]/50 cursor-s-resize z-20 group-hover:bg-[#262626]"
        title="Drag to resize height"
      />

      {/* Bottom-Right Corner Resize Handle */}
      <div
        onPointerDown={(e) => handlePointerDownResize(e, 'corner')}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute right-0 bottom-0 w-4 h-4 bg-[#FF3D00] cursor-se-resize z-30 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
        title="Drag corner to resize width & height"
      >
        <Maximize2 className="w-2.5 h-2.5 text-[#0A0A0A]" />
      </div>
    </div>
  );
}
