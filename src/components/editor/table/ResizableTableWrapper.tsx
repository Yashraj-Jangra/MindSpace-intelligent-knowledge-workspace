'use client';

import React, { useState, useRef } from 'react';
import { GripVertical, RotateCcw, Maximize2, Move } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface ResizableTableWrapperProps {
  children: React.ReactNode;
  tableId?: string;
  editor: Editor | null;
}

export function ResizableTableWrapper({
  children,
  tableId = 'table-1',
  editor,
}: ResizableTableWrapperProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [tableSize, setTableSize] = useState<{ width: number | string; height: number | string }>({
    width: '100%',
    height: 'auto',
  });

  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, startX: 0, startY: 0, rows: 0, cols: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 1. Freeform Position Drag Handlers ──────────────────────
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
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

  // ── 2. Bottom-Right Corner Scaling & Auto-Extension ────────
  const handlePointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);

    const currentWidth = containerRef.current ? containerRef.current.offsetWidth : 400;
    const currentHeight = containerRef.current ? containerRef.current.offsetHeight : 200;

    const tableEl = containerRef.current?.querySelector('table');
    const rowCount = tableEl ? tableEl.querySelectorAll('tr').length : 3;
    const colCount = tableEl && tableEl.querySelector('tr') ? tableEl.querySelector('tr')!.children.length : 3;

    resizeStartRef.current = {
      width: currentWidth,
      height: currentHeight,
      startX: e.clientX,
      startY: e.clientY,
      rows: rowCount,
      cols: colCount,
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const deltaX = e.clientX - resizeStartRef.current.startX;
    const deltaY = e.clientY - resizeStartRef.current.startY;

    const newWidth = Math.max(240, resizeStartRef.current.width + deltaX);
    const newHeight = Math.max(120, resizeStartRef.current.height + deltaY);

    setTableSize({ width: `${newWidth}px`, height: `${newHeight}px` });

    // Check if dragged past threshold to add rows/columns automatically
    const avgColWidth = resizeStartRef.current.width / Math.max(1, resizeStartRef.current.cols);
    const avgRowHeight = resizeStartRef.current.height / Math.max(1, resizeStartRef.current.rows);

    if (deltaX > avgColWidth * 0.95 && editor && editor.isActive('table')) {
      editor.chain().focus().addColumnAfter().run();
      resizeStartRef.current.cols += 1;
      resizeStartRef.current.startX = e.clientX;
    }

    if (deltaY > avgRowHeight * 0.95 && editor && editor.isActive('table')) {
      editor.chain().focus().addRowAfter().run();
      resizeStartRef.current.rows += 1;
      resizeStartRef.current.startY = e.clientY;
    }
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleResetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setTableSize({ width: '100%', height: 'auto' });
  };

  return (
    <div
      ref={containerRef}
      id={`table-wrapper-${tableId}`}
      className="relative group border border-[#262626] hover:border-[#FF3D00] transition-colors my-4 bg-transparent shadow-xl select-none"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: typeof tableSize.width === 'number' ? `${tableSize.width}px` : tableSize.width,
        height: typeof tableSize.height === 'number' ? `${tableSize.height}px` : tableSize.height,
        maxWidth: '100%',
      }}
    >
      {/* Top Drag Header Grip Bar */}
      <div
        onPointerDown={handlePointerDownDrag}
        onPointerMove={handlePointerMoveDrag}
        onPointerUp={handlePointerUpDrag}
        className="h-7 bg-[#141414] border-b border-[#262626] flex items-center justify-between px-3 cursor-grab active:cursor-grabbing text-xs font-mono text-[#737373] hover:text-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-[#FF3D00]" />
          <span className="uppercase text-[10px] font-bold tracking-wider text-[#FAFAFA]">
            Table Grid Box
          </span>
          {(position.x !== 0 || position.y !== 0) && (
            <span className="text-[10px] text-[#FF3D00] bg-[#FF3D00]/10 px-1.5 py-0.5 font-mono">
              ({Math.round(position.x)}px, {Math.round(position.y)}px)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetPosition}
            className="p-1 hover:text-[#FF3D00] transition-colors"
            title="Reset Position & Size"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <Move className="w-3.5 h-3.5 text-[#737373]" />
        </div>
      </div>

      {/* Table Content Surface */}
      <div className="overflow-auto p-2 h-[calc(100%-28px)]">{children}</div>

      {/* Bottom-Right Corner Resize & Extension Handle */}
      <div
        onPointerDown={handlePointerDownResize}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute right-0 bottom-0 w-4 h-4 bg-[#FF3D00] cursor-se-resize z-30 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
        title="Drag corner to scale table bounds & auto-extend rows/columns"
      >
        <Maximize2 className="w-2.5 h-2.5 text-[#0A0A0A]" />
      </div>
    </div>
  );
}
