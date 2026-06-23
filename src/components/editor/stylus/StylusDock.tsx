'use client';

import React, { useState } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  MousePointer,
  Trash2,
  Undo,
  Redo,
  Settings,
  Sparkles,
  ShieldCheck,
  Feather,
  Pencil,
  ChevronDown,
  Type,
} from 'lucide-react';
import {
  StylusTool,
  PenSubtype,
  LineType,
  StylusSettings,
} from '@/lib/stylus/stylus-types';

interface StylusDockProps {
  activeTool: StylusTool;
  onSelectTool: (tool: StylusTool) => void;
  activePenSubtype: PenSubtype;
  onSelectPenSubtype: (subtype: PenSubtype) => void;
  activeColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeWidth: (width: number) => void;
  lineType: LineType;
  onChangeLineType: (lineType: LineType) => void;
  settings: StylusSettings;
  onToggleStylusMode: () => void;
  onToggleAutoShape: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onConvertInkToText: () => void;
  onOpenSettings: () => void;
}

const COLOR_PRESETS = [
  { name: 'Vermillion', hex: '#FF3D00' },
  { name: 'Warm White', hex: '#FAFAFA' },
  { name: 'Electric Blue', hex: '#4285F4' },
  { name: 'Emerald', hex: '#34A853' },
  { name: 'Gold', hex: '#FBBC05' },
];

export function StylusDock({
  activeTool,
  onSelectTool,
  activePenSubtype,
  onSelectPenSubtype,
  activeColor,
  onChangeColor,
  strokeWidth,
  onChangeWidth,
  lineType,
  onChangeLineType,
  settings,
  onToggleStylusMode,
  onToggleAutoShape,
  onUndo,
  onRedo,
  onClear,
  onConvertInkToText,
  onOpenSettings,
}: StylusDockProps) {
  const [showPenMenu, setShowPenMenu] = useState(false);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0F0F0F] border border-[#262626] px-5 py-2.5 shadow-2xl flex items-center gap-4 font-sans select-none animate-in slide-in-from-bottom duration-200">
      {/* Stylus Mode Quick Toggle */}
      <button
        onClick={onToggleStylusMode}
        className={`flex items-center gap-1.5 px-3 py-1.5 border font-mono text-xs uppercase tracking-wider transition-colors ${
          settings.isStylusModeActive
            ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00] font-bold'
            : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
        }`}
        title="Toggle Stylus Mode (Disables Touch Interference)"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Stylus Mode</span>
      </button>

      <div className="h-5 w-px bg-[#262626]" />

      {/* Main Tool Suite */}
      <div className="flex items-center gap-1.5">
        {/* Selection / Edit Tool */}
        <button
          onClick={() => onSelectTool('select')}
          className={`p-2 border transition-colors ${
            activeTool === 'select'
              ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Selection & Element Control Tool"
        >
          <MousePointer className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Unified Pen Tool (Single Master Button with Subtype Dropdown) */}
        <div className="relative">
          <button
            onClick={() => {
              onSelectTool('pen');
              setShowPenMenu(!showPenMenu);
            }}
            className={`flex items-center gap-1 p-2 border transition-colors ${
              activeTool === 'pen'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
            }`}
            title="Unified Pen Tool (Ballpoint, Fountain Pen, Pencil)"
          >
            {activePenSubtype === 'fountain' ? (
              <Feather className="w-4 h-4 stroke-[2]" />
            ) : activePenSubtype === 'pencil' ? (
              <Pencil className="w-4 h-4 stroke-[2]" />
            ) : (
              <Pen className="w-4 h-4 stroke-[2]" />
            )}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {/* Pen Subtype Dropdown Popover */}
          {showPenMenu && (
            <div className="absolute bottom-12 left-0 z-50 bg-[#0F0F0F] border border-[#262626] shadow-2xl p-1.5 w-44 space-y-1 font-mono text-xs">
              <button
                onClick={() => {
                  onSelectPenSubtype('ballpoint');
                  onSelectTool('pen');
                  setShowPenMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  activePenSubtype === 'ballpoint'
                    ? 'bg-[#1A1A1A] text-[#FF3D00] font-bold'
                    : 'text-[#FAFAFA] hover:bg-[#1A1A1A]'
                }`}
              >
                <Pen className="w-3.5 h-3.5 text-[#FF3D00]" />
                <span>Ballpoint Pen</span>
              </button>

              <button
                onClick={() => {
                  onSelectPenSubtype('fountain');
                  onSelectTool('pen');
                  setShowPenMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  activePenSubtype === 'fountain'
                    ? 'bg-[#1A1A1A] text-[#FF3D00] font-bold'
                    : 'text-[#FAFAFA] hover:bg-[#1A1A1A]'
                }`}
              >
                <Feather className="w-3.5 h-3.5 text-[#FF3D00]" />
                <span>Fountain Pen</span>
              </button>

              <button
                onClick={() => {
                  onSelectPenSubtype('pencil');
                  onSelectTool('pen');
                  setShowPenMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                  activePenSubtype === 'pencil'
                    ? 'bg-[#1A1A1A] text-[#FF3D00] font-bold'
                    : 'text-[#FAFAFA] hover:bg-[#1A1A1A]'
                }`}
              >
                <Pencil className="w-3.5 h-3.5 text-[#FF3D00]" />
                <span>Textured Pencil</span>
              </button>
            </div>
          )}
        </div>

        {/* Highlighter Tool */}
        <button
          onClick={() => onSelectTool('highlighter')}
          className={`p-2 border transition-colors ${
            activeTool === 'highlighter'
              ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Translucent Highlighter Tool"
        >
          <Highlighter className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Eraser Tool */}
        <button
          onClick={() => onSelectTool('eraser')}
          className={`p-2 border transition-colors ${
            activeTool === 'eraser'
              ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
              : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Pressure-Sensitive Eraser"
        >
          <Eraser className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      <div className="h-5 w-px bg-[#262626]" />

      {/* Auto Shape Recognition Toggle */}
      <button
        onClick={onToggleAutoShape}
        className={`p-2 border transition-colors ${
          settings.autoShapeRecognition
            ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
            : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
        }`}
        title="Auto Shape Recognition (Converts freehand to clean vector shapes)"
      >
        <Sparkles className="w-4 h-4 stroke-[2]" />
      </button>

      {/* Color Swatches */}
      <div className="flex items-center gap-1.5 border-r border-[#262626] pr-3">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.name}
            onClick={() => onChangeColor(c.hex)}
            className={`w-5 h-5 rounded-none border transition-transform ${
              activeColor === c.hex
                ? 'border-[#FAFAFA] scale-110 ring-2 ring-[#FF3D00]'
                : 'border-[#262626]'
            }`}
            style={{ backgroundColor: c.hex }}
            title={c.name}
          />
        ))}
      </div>

      {/* Thickness & Line Style Controls */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-[#737373] uppercase tracking-wider">
          {strokeWidth}px
        </span>
        <input
          type="range"
          min="1"
          max="24"
          value={strokeWidth}
          onChange={(e) => onChangeWidth(Number(e.target.value))}
          className="w-20 accent-[#FF3D00] cursor-pointer"
        />

        {/* Line Type Selector */}
        <select
          value={lineType}
          onChange={(e) => onChangeLineType(e.target.value as LineType)}
          className="bg-[#1A1A1A] border border-[#262626] text-[11px] font-mono text-[#FAFAFA] px-2 py-1 focus:outline-none uppercase"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>

      <div className="h-5 w-px bg-[#262626]" />

      {/* History & Conversion Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onUndo}
          className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
          title="Undo Stroke"
        >
          <Undo className="w-4 h-4 stroke-[1.5]" />
        </button>
        <button
          onClick={onRedo}
          className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
          title="Redo Stroke"
        >
          <Redo className="w-4 h-4 stroke-[1.5]" />
        </button>

        {/* Convert Ink to Text */}
        <button
          onClick={onConvertInkToText}
          className="flex items-center gap-1 px-2.5 py-1 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] font-mono text-[11px] uppercase tracking-wider transition-colors"
          title="Convert freehand ink to clean structured text"
        >
          <Type className="w-3.5 h-3.5" />
          <span>OCR</span>
        </button>

        <button
          onClick={onClear}
          className="p-1.5 text-[#737373] hover:text-[#FF3D00] transition-colors"
          title="Clear All Canvas Strokes"
        >
          <Trash2 className="w-4 h-4 stroke-[1.5]" />
        </button>
      </div>

      <div className="h-5 w-px bg-[#262626]" />

      {/* Settings Gear */}
      <button
        onClick={onOpenSettings}
        className="p-2 border border-[#262626] text-[#737373] hover:text-[#FAFAFA] transition-colors"
        title="Stylus Hardware & Gesture Settings"
      >
        <Settings className="w-4 h-4 stroke-[1.5]" />
      </button>
    </div>
  );
}
