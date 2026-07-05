'use client';

import React, { useEffect, useRef } from 'react';
import { Lasso, X, BoxSelect, Pen, Shapes, FileText, Table, Image as ImageIcon } from 'lucide-react';
import { StylusSettings } from '@/lib/stylus/stylus-types';

interface LassoSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StylusSettings;
  onUpdateSettings: (newSettings: Partial<StylusSettings>) => void;
}

export function LassoSettingsPopover({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: LassoSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Click Outside Listener to close popover when clicking elsewhere
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('.vertical-stylus-sidebar')) return;
        onCloseRef.current();
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed top-14 left-16 z-[60] w-[340px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#262626] rounded-none shadow-2xl p-4 text-[#FAFAFA] font-sans select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[#FF3D00]">
          <Lasso className="w-4 h-4" />
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#FAFAFA]">
            Lasso Select Settings
          </span>
        </div>

        <button onClick={onClose} className="text-[#737373] hover:text-[#FAFAFA] p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selection Mode Selector Bar (Freehand Lasso vs Rectangular Box Frame) */}
      <div className="grid grid-cols-2 gap-1.5 bg-[#0F0F0F] border border-[#262626] p-2 mb-4">
        {/* 1. Freehand Lasso Loop Mode */}
        <button
          onClick={() => onUpdateSettings({ lassoSelectionMode: 'freehand' })}
          className={`flex items-center justify-center gap-2 p-2 transition-all ${
            settings.lassoSelectionMode === 'freehand'
              ? 'bg-[#1A1A1A] border border-[#FF3D00] text-[#FF3D00]'
              : 'border border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Freehand Lasso Loop (Draw custom loop around elements)"
        >
          <Lasso className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Freehand Loop</span>
        </button>

        {/* 2. Rectangular Box Selection Mode */}
        <button
          onClick={() => onUpdateSettings({ lassoSelectionMode: 'box' })}
          className={`flex items-center justify-center gap-2 p-2 transition-all ${
            settings.lassoSelectionMode === 'box'
              ? 'bg-[#1A1A1A] border border-[#FF3D00] text-[#FF3D00]'
              : 'border border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Box Selection Frame (Drag bounding box to select elements)"
        >
          <BoxSelect className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Box Frame</span>
        </button>
      </div>

      {/* Target Element Scope Checkboxes */}
      <div className="space-y-2.5 bg-[#0F0F0F] border border-[#262626] p-3">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">
          Target Element Scope Filter
        </span>

        {/* 1. Freehand Drawings & Ink Strokes */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span className="flex items-center gap-2">
            <Pen className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span>Freehand Ink & Strokes</span>
          </span>
          <input
            type="checkbox"
            checked={settings.selectDrawings}
            onChange={(e) => onUpdateSettings({ selectDrawings: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>

        {/* 2. Vector Shapes */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span className="flex items-center gap-2">
            <Shapes className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span>Recognized Shapes</span>
          </span>
          <input
            type="checkbox"
            checked={settings.selectShapes}
            onChange={(e) => onUpdateSettings({ selectShapes: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>

        {/* 3. Text Blocks */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span>Text Paragraphs & Headings</span>
          </span>
          <input
            type="checkbox"
            checked={settings.selectText}
            onChange={(e) => onUpdateSettings({ selectText: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>

        {/* 4. ProseMirror Tables */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span className="flex items-center gap-2">
            <Table className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span>ProseMirror Data Tables</span>
          </span>
          <input
            type="checkbox"
            checked={settings.selectTables}
            onChange={(e) => onUpdateSettings({ selectTables: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>

        {/* 5. Images */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span>Media & Images</span>
          </span>
          <input
            type="checkbox"
            checked={settings.selectImages}
            onChange={(e) => onUpdateSettings({ selectImages: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
