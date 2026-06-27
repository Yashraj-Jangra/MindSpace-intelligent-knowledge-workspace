'use client';

import React, { useEffect, useRef } from 'react';
import { Eraser, X, Scissors, CircleDot, ShieldAlert } from 'lucide-react';
import { EraserMode, StylusSettings } from '@/lib/stylus/stylus-types';

interface EraserSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StylusSettings;
  onUpdateSettings: (newSettings: Partial<StylusSettings>) => void;
}

export function EraserSettingsPopover({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: EraserSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Click Outside Listener to close popover when clicking elsewhere
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('.vertical-stylus-sidebar')) return;
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pressurePercent = Math.round(settings.eraserPressureThreshold * 100);

  return (
    <div
      ref={popoverRef}
      className="fixed top-14 left-16 z-50 w-[340px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#262626] rounded-none shadow-2xl p-4 text-[#FAFAFA] font-sans select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[#FF3D00]">
          <Eraser className="w-3.5 h-3.5" />
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#FAFAFA]">
            Eraser Tool Settings
          </span>
        </div>

        <button onClick={onClose} className="text-[#737373] hover:text-[#FAFAFA] p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Eraser Mode Selector Bar (Pixel, Stroke, Circular) */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#0F0F0F] border border-[#262626] p-2 mb-4">
        {/* 1. Stroke Erase */}
        <button
          onClick={() => onUpdateSettings({ eraserMode: 'stroke' })}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            settings.eraserMode === 'stroke'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Stroke Erase (Deletes whole stroke when touched)"
        >
          <Eraser className="w-4 h-4 mb-1 text-[#FF3D00]" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#FAFAFA]">Stroke</span>
        </button>

        {/* 2. Pixel Erase */}
        <button
          onClick={() => onUpdateSettings({ eraserMode: 'pixel' })}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            settings.eraserMode === 'pixel'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Pixel Erase (Cuts exact stroke points at contact boundary)"
        >
          <Scissors className="w-4 h-4 mb-1 text-[#FF3D00]" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#FAFAFA]">Pixel</span>
        </button>

        {/* 3. Circular Selection Erase */}
        <button
          onClick={() => onUpdateSettings({ eraserMode: 'circular' })}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            settings.eraserMode === 'circular'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Circular Selection (Erases all ink inside a circular area)"
        >
          <CircleDot className="w-4 h-4 mb-1 text-[#FF3D00]" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#FAFAFA]">Circular</span>
        </button>
      </div>

      {/* Eraser Radius Size Slider */}
      <div className="space-y-1 mb-3.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#737373] uppercase">Eraser Ring Radius</span>
          <span className="text-[#FAFAFA] font-bold">{settings.eraserSize}px</span>
        </div>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={settings.eraserSize}
          onChange={(e) => onUpdateSettings({ eraserSize: Number(e.target.value) })}
          className="w-full accent-[#FF3D00] cursor-pointer h-1 bg-[#262626]"
        />
      </div>

      {/* Pressure Sensitive Threshold Slider */}
      <div className="space-y-1 mb-4 bg-[#0F0F0F] border border-[#262626] p-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="flex items-center gap-1 text-[#737373] uppercase">
            <ShieldAlert className="w-3 h-3 text-[#FF3D00]" />
            <span>Pressure Sensitivity</span>
          </span>
          <span className="text-[#FF3D00] font-bold">{pressurePercent}%</span>
        </div>
        <input
          type="range"
          min="20"
          max="90"
          step="5"
          value={pressurePercent}
          onChange={(e) => onUpdateSettings({ eraserPressureThreshold: Number(e.target.value) / 100 })}
          className="w-full accent-[#FF3D00] cursor-pointer h-1 bg-[#262626]"
        />
        <span className="text-[9px] font-mono text-[#737373] block mt-1">
          Eraser activates only when stylus pressure exceeds threshold.
        </span>
      </div>

      {/* Target Content Scope Checkboxes (Pen & Highlighter) */}
      <div className="space-y-2 bg-[#0F0F0F] border border-[#262626] p-2.5">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">
          Target Content to Erase
        </span>

        {/* Erase Pen Strokes */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span>Pen Ink Strokes</span>
          <input
            type="checkbox"
            checked={settings.erasePenStrokes}
            onChange={(e) => onUpdateSettings({ erasePenStrokes: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>

        {/* Erase Highlighter Strokes */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span>Highlighter Markings</span>
          <input
            type="checkbox"
            checked={settings.eraseHighlighterStrokes}
            onChange={(e) => onUpdateSettings({ eraseHighlighterStrokes: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
