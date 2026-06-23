'use client';

import React from 'react';
import { Camera, Crop, Mic, Plus } from 'lucide-react';
import {
  PenSubtype,
  LineType,
  SmoothingLevel,
  StylusSettings,
} from '@/lib/stylus/stylus-types';
import {
  FountainNibIcon,
  CalligraphyNibIcon,
  FinelinerNibIcon,
  BallpointNibIcon,
  PencilNibIcon,
} from './PenNibIcons';

export interface PenPreset {
  id: string;
  name: string;
  subtype: PenSubtype;
  color: string;
  width: number;
  lineType: LineType;
  smoothing: SmoothingLevel;
}

interface PenSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  activePenSubtype: PenSubtype;
  onSelectPenSubtype: (subtype: PenSubtype) => void;
  activeColor: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeWidth: (width: number) => void;
  lineType: LineType;
  onChangeLineType: (lineType: LineType) => void;
  settings: StylusSettings;
  onUpdateSettings: (newSettings: Partial<StylusSettings>) => void;
  onAddToPenBox: (preset: PenPreset) => void;
}

const COLOR_SWATCHES = [
  { name: 'Warm White', hex: '#FAFAFA' },
  { name: 'Crimson', hex: '#D32F2F' },
  { name: 'Deep Blue', hex: '#1976D2' },
  { name: 'Periwinkle', hex: '#5C6BC0' },
  { name: 'Gold', hex: '#FBC02D' },
  { name: 'Vermillion', hex: '#FF3D00' },
];

const PEN_NAMES: Record<PenSubtype, string> = {
  ballpoint: 'Ballpoint pen',
  fountain: 'Fountain pen',
  pencil: 'Textured pencil',
};

export function PenSettingsPopover({
  isOpen,
  onClose,
  activePenSubtype,
  onSelectPenSubtype,
  activeColor,
  onChangeColor,
  strokeWidth,
  onChangeWidth,
  lineType,
  onChangeLineType,
  settings,
  onUpdateSettings,
  onAddToPenBox,
}: PenSettingsPopoverProps) {
  if (!isOpen) return null;

  // Convert numeric smoothing factor to percentage (0% to 100%)
  const stabilizationPercent =
    settings.smoothingLevel === 'high' ? 80 : settings.smoothingLevel === 'mild' ? 40 : 0;

  const handleStabilizationChange = (val: number) => {
    const level: SmoothingLevel = val >= 60 ? 'high' : val >= 20 ? 'mild' : 'none';
    onUpdateSettings({ smoothingLevel: level });
  };

  const handleAddPreset = () => {
    const newPreset: PenPreset = {
      id: `preset-${Date.now()}`,
      name: PEN_NAMES[activePenSubtype] || 'Custom Pen',
      subtype: activePenSubtype,
      color: activeColor,
      width: strokeWidth,
      lineType,
      smoothing: settings.smoothingLevel,
    };
    onAddToPenBox(newPreset);
  };

  return (
    <div className="fixed top-16 left-16 z-50 w-96 bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl p-5 text-[#FAFAFA] font-sans select-none animate-in zoom-in-95 duration-150">
      {/* Top Title Header & Quick Tools */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-3 mb-4">
        <div className="flex items-center gap-3 text-[#A1A1AA]">
          <Camera className="w-4 h-4 hover:text-[#FAFAFA] cursor-pointer" />
          <Crop className="w-4 h-4 hover:text-[#FAFAFA] cursor-pointer" />
          <Mic className="w-4 h-4 hover:text-[#FAFAFA] cursor-pointer" />
        </div>

        <span className="font-sans font-semibold text-base text-[#FAFAFA]">
          {PEN_NAMES[activePenSubtype] || 'Ballpoint pen'}
        </span>

        {/* Live Pen Stroke Waveform Preview */}
        <svg className="w-12 h-6" viewBox="0 0 48 24" fill="none">
          <path
            d="M4 18C12 6 20 20 28 8C34 2 40 14 44 10"
            stroke={activeColor}
            strokeWidth={Math.max(2, strokeWidth * 0.8)}
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 5 Stylized Nib Selection Row */}
      <div className="flex items-center justify-between bg-[#27272A]/50 rounded-xl p-2 mb-5">
        <button
          onClick={() => onSelectPenSubtype('fountain')}
          className={`p-2 rounded-lg transition-all ${
            activePenSubtype === 'fountain'
              ? 'bg-[#18181B] ring-2 ring-[#00B4D8] scale-105'
              : 'hover:bg-[#27272A]'
          }`}
          title="Fountain Pen 1"
        >
          <FountainNibIcon isSelected={activePenSubtype === 'fountain'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('fountain')}
          className={`p-2 rounded-lg transition-all ${
            activePenSubtype === 'fountain'
              ? 'bg-[#18181B] ring-2 ring-[#00B4D8] scale-105'
              : 'hover:bg-[#27272A]'
          }`}
          title="Calligraphy Pen 2"
        >
          <CalligraphyNibIcon isSelected={activePenSubtype === 'fountain'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('ballpoint')}
          className={`p-2 rounded-lg transition-all ${
            activePenSubtype === 'ballpoint'
              ? 'bg-[#18181B] ring-2 ring-[#00B4D8] scale-105'
              : 'hover:bg-[#27272A]'
          }`}
          title="Fineliner / Technical Pen"
        >
          <FinelinerNibIcon isSelected={activePenSubtype === 'ballpoint'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('ballpoint')}
          className={`p-2 rounded-lg transition-all ${
            activePenSubtype === 'ballpoint'
              ? 'bg-[#18181B] ring-2 ring-[#00B4D8] scale-105'
              : 'hover:bg-[#27272A]'
          }`}
          title="Ballpoint Pen"
        >
          <BallpointNibIcon isSelected={activePenSubtype === 'ballpoint'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('pencil')}
          className={`p-2 rounded-lg transition-all ${
            activePenSubtype === 'pencil'
              ? 'bg-[#18181B] ring-2 ring-[#00B4D8] scale-105'
              : 'hover:bg-[#27272A]'
          }`}
          title="Textured Pencil"
        >
          <PencilNibIcon isSelected={activePenSubtype === 'pencil'} />
        </button>
      </div>

      {/* Line Type Selector Pills */}
      <div className="space-y-2 mb-5">
        <label className="text-xs font-medium text-[#A1A1AA] block">Line type</label>
        <div className="grid grid-cols-3 gap-2">
          {/* Solid */}
          <button
            onClick={() => onChangeLineType('solid')}
            className={`h-10 rounded-xl border flex items-center justify-center transition-all ${
              lineType === 'solid'
                ? 'border-[#00B4D8] bg-[#00B4D8]/10 text-[#00B4D8]'
                : 'border-[#27272A] bg-[#27272A]/30 text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            <div className="w-12 h-0.5 bg-current rounded-full" />
          </button>

          {/* Dashed */}
          <button
            onClick={() => onChangeLineType('dashed')}
            className={`h-10 rounded-xl border flex items-center justify-center transition-all ${
              lineType === 'dashed'
                ? 'border-[#00B4D8] bg-[#00B4D8]/10 text-[#00B4D8]'
                : 'border-[#27272A] bg-[#27272A]/30 text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            <div className="w-12 border-t-2 border-dashed border-current" />
          </button>

          {/* Dotted */}
          <button
            onClick={() => onChangeLineType('dotted')}
            className={`h-10 rounded-xl border flex items-center justify-center transition-all ${
              lineType === 'dotted'
                ? 'border-[#00B4D8] bg-[#00B4D8]/10 text-[#00B4D8]'
                : 'border-[#27272A] bg-[#27272A]/30 text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            <div className="w-12 border-t-2 border-dotted border-current" />
          </button>
        </div>
      </div>

      {/* Thickness Slider */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-[#A1A1AA]">Thickness</span>
          <span className="text-[#FAFAFA] font-mono">{(strokeWidth * 0.1).toFixed(2)}mm</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => onChangeWidth(Number(e.target.value))}
          className="w-full accent-[#00B4D8] cursor-pointer"
        />
      </div>

      {/* Stroke Stabilization Slider with Tick Marks */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-[#A1A1AA]">Stroke Stabilization</span>
          <span className="text-[#FAFAFA] font-mono">{stabilizationPercent}%</span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={stabilizationPercent}
            onChange={(e) => handleStabilizationChange(Number(e.target.value))}
            className="w-full accent-[#00B4D8] cursor-pointer z-10"
          />
        </div>
      </div>

      {/* Colour Swatches Row */}
      <div className="space-y-2 mb-6">
        <label className="text-xs font-medium text-[#A1A1AA] block">Colour</label>
        <div className="flex items-center justify-between px-1">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c.name}
              onClick={() => onChangeColor(c.hex)}
              className={`w-7 h-7 rounded-full transition-all ${
                activeColor === c.hex
                  ? 'ring-2 ring-offset-2 ring-offset-[#18181B] ring-[#00B4D8] scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Add to Pen Box Button */}
      <button
        onClick={handleAddPreset}
        className="w-full py-3 rounded-2xl border border-[#00B4D8] bg-[#00B4D8]/10 hover:bg-[#00B4D8]/20 text-[#00B4D8] font-sans text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Add to pen box</span>
      </button>
    </div>
  );
}
