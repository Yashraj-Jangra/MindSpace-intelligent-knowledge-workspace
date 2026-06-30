'use client';

import React, { useEffect, useRef } from 'react';
import { Sparkles, X, CheckCircle, Clock } from 'lucide-react';
import { StylusSettings } from '@/lib/stylus/stylus-types';

interface ShapeSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StylusSettings;
  onUpdateSettings: (newSettings: Partial<StylusSettings>) => void;
}

const HOLD_TIME_OPTIONS = [
  { label: '0.3s', ms: 300 },
  { label: '0.5s', ms: 500 },
  { label: '0.8s', ms: 800 },
  { label: '1.2s', ms: 1200 },
  { label: '1.5s', ms: 1500 },
];

export function ShapeSettingsPopover({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: ShapeSettingsPopoverProps) {
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
      className="fixed top-14 left-16 z-50 w-[320px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#262626] rounded-none shadow-2xl p-4 text-[#FAFAFA] font-sans select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[#FF3D00]">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#FAFAFA]">
            Auto-Shape Recognizer
          </span>
        </div>

        <button onClick={onClose} className="text-[#737373] hover:text-[#FAFAFA] p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto-Shape Master Toggle */}
      <div className="flex items-center justify-between bg-[#0F0F0F] border border-[#262626] p-2.5 mb-3.5">
        <div className="flex items-center gap-2">
          <CheckCircle
            className={`w-4 h-4 ${settings.autoShapeRecognition ? 'text-[#FF3D00]' : 'text-[#737373]'}`}
          />
          <span className="text-xs font-mono font-bold text-[#FAFAFA] uppercase">Auto-Shape Conversion</span>
        </div>

        <input
          type="checkbox"
          checked={settings.autoShapeRecognition}
          onChange={(e) => onUpdateSettings({ autoShapeRecognition: e.target.checked })}
          className="accent-[#FF3D00] w-4 h-4 cursor-pointer"
        />
      </div>

      {/* Live Hold Conversion Timer Selector */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#737373]">
          <span className="flex items-center gap-1 uppercase">
            <Clock className="w-3 h-3 text-[#FF3D00]" />
            <span>Hold Conversion Timer</span>
          </span>
          <span className="text-[#FF3D00] font-bold">{(settings.shapeHoldTimerMs / 1000).toFixed(1)}s</span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {HOLD_TIME_OPTIONS.map((opt) => (
            <button
              key={opt.ms}
              onClick={() => onUpdateSettings({ shapeHoldTimerMs: opt.ms })}
              className={`h-7 border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                settings.shapeHoldTimerMs === opt.ms
                  ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00] font-bold'
                  : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Scoping Toggles (Pen & Highlighter ONLY) */}
      <div className="space-y-2 mb-4 bg-[#0F0F0F] border border-[#262626] p-2.5">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">
          Active Tools for Shape Recognition
        </span>

        {/* Enable for Pen Tool */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span>Pen Tool</span>
          <input
            type="checkbox"
            checked={settings.enableShapeForPen}
            onChange={(e) => onUpdateSettings({ enableShapeForPen: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>

        {/* Enable for Highlighter Tool */}
        <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]">
          <span>Highlighter Tool</span>
          <input
            type="checkbox"
            checked={settings.enableShapeForHighlighter}
            onChange={(e) => onUpdateSettings({ enableShapeForHighlighter: e.target.checked })}
            className="accent-[#FF3D00] w-3.5 h-3.5 cursor-pointer"
          />
        </div>
      </div>

      {/* Supported Shapes Badges */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">
          Supported Auto-Shapes
        </span>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Circle</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Ellipse</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Triangle</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Square</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Rectangle</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Diamond</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Line</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Arrow</span>
          <span className="px-2.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]">Arc</span>
        </div>
      </div>
    </div>
  );
}
