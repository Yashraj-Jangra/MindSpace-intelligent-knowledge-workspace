'use client';

import React from 'react';
import {
  ChevronLeft,
  Undo,
  Redo,
  Pen,
  Highlighter,
  Eraser,
  MousePointer,
  Image as ImageIcon,
  Type,
  Sparkles,
  ShieldCheck,
  Star,
  Plus,
} from 'lucide-react';
import { StylusTool, StylusSettings } from '@/lib/stylus/stylus-types';
import { PenPreset } from './PenSettingsPopover';

interface VerticalStylusSidebarProps {
  activeTool: StylusTool;
  onSelectTool: (tool: StylusTool) => void;
  onTogglePenPopover: () => void;
  settings: StylusSettings;
  onToggleStylusMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  penBoxPresets: PenPreset[];
  onSelectPreset: (preset: PenPreset) => void;
  onBackToDashboard: () => void;
}

export function VerticalStylusSidebar({
  activeTool,
  onSelectTool,
  onTogglePenPopover,
  settings,
  onToggleStylusMode,
  onUndo,
  onRedo,
  penBoxPresets,
  onSelectPreset,
  onBackToDashboard,
}: VerticalStylusSidebarProps) {
  return (
    <aside className="fixed top-0 left-0 bottom-0 z-40 w-14 bg-[#18181B] border-r border-[#27272A] flex flex-col justify-between items-center py-4 font-sans select-none shadow-2xl">
      {/* Top Section: Back, Undo, Redo */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onBackToDashboard}
          className="p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          title="Back to Dashboard"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="w-8 h-px bg-[#27272A]" />

        <button
          onClick={onUndo}
          className="p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          title="Undo Stroke"
        >
          <Undo className="w-4 h-4 stroke-[1.5]" />
        </button>

        <button
          onClick={onRedo}
          className="p-2 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          title="Redo Stroke"
        >
          <Redo className="w-4 h-4 stroke-[1.5]" />
        </button>

        <div className="w-8 h-px bg-[#27272A]" />

        {/* Stylus Mode Palm Rejection Quick Toggle */}
        <button
          onClick={onToggleStylusMode}
          className={`p-2 rounded-lg transition-colors ${
            settings.isStylusModeActive
              ? 'bg-[#00B4D8]/10 text-[#00B4D8] ring-1 ring-[#00B4D8]'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
          }`}
          title="Stylus Mode (Palm Rejection)"
        >
          <ShieldCheck className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Center Section: Main Tools Suite */}
      <div className="flex flex-col items-center gap-3">
        {/* Pen Tool (Triggers PenSettingsPopover) */}
        <button
          onClick={() => {
            onSelectTool('pen');
            onTogglePenPopover();
          }}
          className={`p-2.5 rounded-xl transition-all relative ${
            activeTool === 'pen'
              ? 'bg-[#00B4D8] text-[#0F0F0F] shadow-lg shadow-[#00B4D8]/20 scale-110'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
          }`}
          title="Pen Tool (Click for Pen Settings)"
        >
          <Pen className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Highlighter Tool */}
        <button
          onClick={() => onSelectTool('highlighter')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'highlighter'
              ? 'bg-[#00B4D8] text-[#0F0F0F] shadow-lg shadow-[#00B4D8]/20 scale-110'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
          }`}
          title="Translucent Highlighter"
        >
          <Highlighter className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Eraser Tool */}
        <button
          onClick={() => onSelectTool('eraser')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'eraser'
              ? 'bg-[#00B4D8] text-[#0F0F0F] shadow-lg shadow-[#00B4D8]/20 scale-110'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
          }`}
          title="Pressure Eraser"
        >
          <Eraser className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Lasso Select Tool */}
        <button
          onClick={() => onSelectTool('select')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTool === 'select'
              ? 'bg-[#00B4D8] text-[#0F0F0F] shadow-lg shadow-[#00B4D8]/20 scale-110'
              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
          }`}
          title="Lasso Select & Control Handles"
        >
          <MousePointer className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Auto-Shape Recognition */}
        <button
          onClick={() => onSelectTool('pen')}
          className="p-2.5 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-xl transition-colors"
          title="Auto-Shape Recognizer"
        >
          <Sparkles className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Bottom Section: Favorite Pen Box Shelf */}
      <div className="flex flex-col items-center gap-2 pt-3 border-t border-[#27272A] w-full px-2">
        <Star className="w-3.5 h-3.5 text-[#00B4D8]" />

        {/* Saved Pen Box Presets Swatches */}
        <div className="flex flex-col gap-2 max-h-36 overflow-y-auto no-scrollbar">
          {penBoxPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className="w-6 h-6 rounded-full border border-[#27272A] hover:scale-110 transition-transform shadow-md"
              style={{ backgroundColor: preset.color }}
              title={`${preset.name} (${preset.width}px)`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
