'use client';

import React, { useEffect, useRef } from 'react';
import { Highlighter, X, Minus, Sparkles } from 'lucide-react';
import { HighlighterSubtype, StylusSettings } from '@/lib/stylus/stylus-types';

interface HighlighterSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  activeColor: string;
  onChangeColor: (color: string) => void;
  settings: StylusSettings;
  onUpdateSettings: (newSettings: Partial<StylusSettings>) => void;
}

const HIGHLIGHTER_NEON_SWATCHES = [
  { name: 'Neon Yellow', hex: '#FFE500' },
  { name: 'Neon Green', hex: '#00FF66' },
  { name: 'Neon Pink', hex: '#FF007F' },
  { name: 'Neon Cyan', hex: '#00E5FF' },
  { name: 'Neon Orange', hex: '#FF8800' },
  { name: 'Neon Purple', hex: '#A020F0' },
];

export function HighlighterSettingsPopover({
  isOpen,
  onClose,
  activeColor,
  onChangeColor,
  settings,
  onUpdateSettings,
}: HighlighterSettingsPopoverProps) {
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

  return (
    <div
      ref={popoverRef}
      className="fixed top-14 left-16 z-50 w-[340px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#262626] rounded-none shadow-2xl p-4 text-[#FAFAFA] font-sans select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[#FF3D00]">
          <Highlighter className="w-3.5 h-3.5" />
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#FAFAFA]">
            Highlighter Settings
          </span>
        </div>

        <button onClick={onClose} className="text-[#737373] hover:text-[#FAFAFA] p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2 Nib Subtype Selector Bar (Flat Chisel vs Round Bullet) */}
      <div className="grid grid-cols-2 gap-2 bg-[#0F0F0F] border border-[#262626] p-2 mb-4">
        {/* 1. Flat Chisel Nib */}
        <button
          onClick={() => onUpdateSettings({ activeHighlighterSubtype: 'flat' })}
          className={`flex flex-col items-center justify-center p-2.5 transition-all ${
            settings.activeHighlighterSubtype === 'flat'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Flat Chisel Nib (Angled Marker Edge)"
        >
          <div className="w-8 h-4 bg-[#FF3D00] transform -skew-x-12 mb-1.5 opacity-90" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FAFAFA]">Flat Chisel</span>
        </button>

        {/* 2. Round Bullet Nib */}
        <button
          onClick={() => onUpdateSettings({ activeHighlighterSubtype: 'round' })}
          className={`flex flex-col items-center justify-center p-2.5 transition-all ${
            settings.activeHighlighterSubtype === 'round'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Round Bullet Nib (Soft Circular Marker)"
        >
          <div className="w-5 h-5 bg-[#FF3D00] rounded-full mb-1.5 opacity-90" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FAFAFA]">Round Bullet</span>
        </button>
      </div>

      {/* Draw Straight Lines Auto-Snap Toggle */}
      <div className="flex items-center justify-between bg-[#0F0F0F] border border-[#262626] p-2.5 mb-3.5">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FAFAFA]">
          <Minus className="w-4 h-4 text-[#FF3D00]" />
          <span className="uppercase">Draw Straight Lines</span>
        </div>

        <input
          type="checkbox"
          checked={settings.highlighterDrawStraightLines}
          onChange={(e) => onUpdateSettings({ highlighterDrawStraightLines: e.target.checked })}
          className="accent-[#FF3D00] w-4 h-4 cursor-pointer"
        />
      </div>

      {/* Thickness Slider */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#737373] uppercase">Thickness</span>
          <span className="text-[#FAFAFA] font-bold">{settings.highlighterThickness}px</span>
        </div>
        <input
          type="range"
          min="10"
          max="50"
          step="2"
          value={settings.highlighterThickness}
          onChange={(e) => onUpdateSettings({ highlighterThickness: Number(e.target.value) })}
          className="w-full accent-[#FF3D00] cursor-pointer h-1 bg-[#262626]"
        />
      </div>

      {/* Neon Swatches Row */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">Highlighter Colour</span>
        <div className="flex items-center justify-between">
          {HIGHLIGHTER_NEON_SWATCHES.map((c) => (
            <button
              key={c.name}
              onClick={() => onChangeColor(c.hex)}
              className={`w-7 h-7 border transition-transform ${
                activeColor === c.hex
                  ? 'border-[#FAFAFA] scale-110 ring-2 ring-[#FF3D00]'
                  : 'border-[#262626]'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
