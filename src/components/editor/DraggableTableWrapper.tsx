'use client';

import React, { useState } from 'react';
import { GripVertical, Move, Maximize2 } from 'lucide-react';

interface DraggableTableWrapperProps {
  children: React.ReactNode;
  tableId: string;
}

export function DraggableTableWrapper({ children, tableId }: DraggableTableWrapperProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }
  };

  return (
    <div
      id={`table-wrapper-${tableId}`}
      className="relative group border border-[#262626] hover:border-[#FF3D00] transition-colors my-4 p-2 bg-[#0F0F0F]"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      {/* Top Drag Handle Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="h-6 bg-[#1A1A1A] border-b border-[#262626] flex items-center justify-between px-2 cursor-grab active:cursor-grabbing select-none text-xs font-mono text-[#737373] hover:text-[#FAFAFA]"
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-[#FF3D00]" />
          <span className="uppercase text-[10px] tracking-wider">Draggable Table Block</span>
        </div>
        <Move className="w-3 h-3 text-[#737373]" />
      </div>

      {/* Children ProseMirror Table */}
      <div className="overflow-x-auto p-2">{children}</div>
    </div>
  );
}
