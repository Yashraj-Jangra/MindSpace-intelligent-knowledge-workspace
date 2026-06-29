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
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { StylusTool, StylusSettings } from '@/lib/stylus/stylus-types';

interface VerticalStylusSidebarProps {
  activeTool: StylusTool;
  onSelectTool: (tool: StylusTool) => void;
  onTogglePenPopover: () => void;
  onClosePenPopover: () => void;
  onToggleHighlighterPopover: () => void;
  onToggleEraserPopover: () => void;
  onToggleLassoPopover: () => void;
  onToggleShapePopover: () => void;
  settings: StylusSettings;
  onToggleStylusMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function VerticalStylusSidebar({
  activeTool,
  onSelectTool,
  onTogglePenPopover,
  onClosePenPopover,
  onToggleHighlighterPopover,
  onToggleEraserPopover,
  onToggleLassoPopover,
  onToggleShapePopover,
  settings,
  onToggleStylusMode,
  onUndo,
  onRedo,
}: VerticalStylusSidebarProps) {
  return (
    <aside className="fixed top-14 left-0 bottom-0 z-30 w-12 bg-[#0F0F0F] border-r border-[#262626] flex flex-col justify-between items-center py-3 font-sans select-none shadow-2xl vertical-stylus-sidebar">
      {/* Top Section: Undo, Redo */}
      <div className="flex flex-col items-center gap-3">

        <button
          onClick={onUndo}
          className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
          title="Undo Stroke"
        >
          <Undo className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

        <button
          onClick={onRedo}
          className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
          title="Redo Stroke"
        >
          <Redo className="w-3.5 h-3.5 stroke-[1.5]" />
        </button>

      </div>

      {/* Center Section: Tools Suite */}
      <div className="flex flex-col items-center gap-2">
        {/* Pen Tool (Triggers PenSettingsPopover) */}
        <button
          onClick={() => {
            onSelectTool('pen');
            onTogglePenPopover();
          }}
          className={`p-2 border transition-colors ${
            activeTool === 'pen'
              ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Pen Tool (Click for Pen Settings)"
        >
          <Pen className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Highlighter Tool (Click for Highlighter Settings) */}
        <button
          onClick={() => {
            onSelectTool('highlighter');
            onToggleHighlighterPopover();
          }}
          className={`p-2 border transition-colors ${
            activeTool === 'highlighter'
              ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Translucent Highlighter (Click for Highlighter Settings)"
        >
          <Highlighter className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Eraser Tool (Click for Eraser Settings) */}
        <button
          onClick={() => {
            onSelectTool('eraser');
            onToggleEraserPopover();
          }}
          className={`p-2 border transition-colors ${
            activeTool === 'eraser'
              ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Eraser Tool (Click for Eraser Settings)"
        >
          <Eraser className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Lasso Select Tool (Click for Lasso Settings) */}
        <button
          onClick={() => {
            onSelectTool('select');
            onToggleLassoPopover();
          }}
          className={`p-2 border transition-colors ${
            activeTool === 'select'
              ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Lasso Select & Control Handles"
        >
          <MousePointer className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Auto-Shape Recognition Settings */}
        <button
          onClick={() => {
            onToggleShapePopover();
          }}
          className={`p-2 border transition-colors ${
            settings.autoShapeRecognition
              ? 'border-[#FF3D00] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Auto-Shape Settings (Hold Timer & Tool Scope)"
        >
          <Sparkles className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-[#262626] w-full px-1">
        <div className="w-2 h-2 rounded-full bg-[#FF3D00]" title="Stylus Connected" />
      </div>
    </aside>
  );
}
