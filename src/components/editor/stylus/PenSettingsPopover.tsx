'use client';

import React from 'react';
import { Camera, Crop, Mic, Plus, Sparkles, X } from 'lucide-react';
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
  { name: 'Vermillion', hex: '#FF3D00' },
  { name: 'Electric Blue', hex: '#4285F4' },
  { name: 'Emerald', hex: '#34A853' },
  { name: 'Gold', hex: '#FBBC05' },
  { name: 'Crimson', hex: '#D32F2F' },
];

const PEN_NAMES: Record<PenSubtype, string> = {
  ballpoint: 'Ballpoint Pen',
  fountain: 'Fountain Pen',
  pencil: 'Textured Pencil',
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
    <div className="fixed top-14 left-16 z-50 w-80 bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#262626] rounded-none shadow-2xl p-4 text-[#FAFAFA] font-sans select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Top Header & Quick Actions */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2.5 mb-3">
        <div className="flex items-center gap-2 text-[#737373]">
          <Camera className="w-3.5 h-3.5 hover:text-[#FAFAFA] cursor-pointer transition-colors" />
          <Crop className="w-3.5 h-3.5 hover:text-[#FAFAFA] cursor-pointer transition-colors" />
          <Mic className="w-3.5 h-3.5 hover:text-[#FAFAFA] cursor-pointer transition-colors" />
        </div>

        <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#FAFAFA]">
          {PEN_NAMES[activePenSubtype]}
        </span>

        <button onClick={onClose} className="text-[#737373] hover:text-[#FAFAFA] p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compact 5 Nib Selection Bar */}
      <div className="flex items-center justify-between bg-[#0F0F0F] border border-[#262626] p-1.5 mb-3.5">
        <button
          onClick={() => onSelectPenSubtype('fountain')}
          className={`p-1.5 transition-all ${
            activePenSubtype === 'fountain'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Fountain Pen 1"
        >
          <FountainNibIcon className="w-5 h-8" isSelected={activePenSubtype === 'fountain'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('fountain')}
          className={`p-1.5 transition-all ${
            activePenSubtype === 'fountain'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Calligraphy Pen 2"
        >
          <CalligraphyNibIcon className="w-5 h-8" isSelected={activePenSubtype === 'fountain'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('ballpoint')}
          className={`p-1.5 transition-all ${
            activePenSubtype === 'ballpoint'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Fineliner / Technical Pen"
        >
          <FinelinerNibIcon className="w-5 h-8" isSelected={activePenSubtype === 'ballpoint'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('ballpoint')}
          className={`p-1.5 transition-all ${
            activePenSubtype === 'ballpoint'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Ballpoint Pen"
        >
          <BallpointNibIcon className="w-5 h-8" isSelected={activePenSubtype === 'ballpoint'} />
        </button>

        <button
          onClick={() => onSelectPenSubtype('pencil')}
          className={`p-1.5 transition-all ${
            activePenSubtype === 'pencil'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Textured Pencil"
        >
          <PencilNibIcon className="w-5 h-8" isSelected={activePenSubtype === 'pencil'} />
        </button>
      </div>

      {/* Minimal Line Type Pills */}
      <div className="space-y-1.5 mb-3.5">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">Line Type</span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onChangeLineType('solid')}
            className={`h-7 border text-[10px] font-mono uppercase tracking-wider flex items-center justify-center transition-colors ${
              lineType === 'solid'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00] font-bold'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => onChangeLineType('dashed')}
            className={`h-7 border text-[10px] font-mono uppercase tracking-wider flex items-center justify-center transition-colors ${
              lineType === 'dashed'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00] font-bold'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            Dashed
          </button>
          <button
            onClick={() => onChangeLineType('dotted')}
            className={`h-7 border text-[10px] font-mono uppercase tracking-wider flex items-center justify-center transition-colors ${
              lineType === 'dotted'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00] font-bold'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            Dotted
          </button>
        </div>
      </div>

      {/* Compact Thickness Slider */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#737373] uppercase">Thickness</span>
          <span className="text-[#FAFAFA]">{(strokeWidth * 0.1).toFixed(2)}mm</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => onChangeWidth(Number(e.target.value))}
          className="w-full accent-[#FF3D00] cursor-pointer h-1 bg-[#262626]"
        />
      </div>

      {/* Compact Stabilization Slider */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#737373] uppercase">Stabilization</span>
          <span className="text-[#FAFAFA]">{stabilizationPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={stabilizationPercent}
          onChange={(e) => handleStabilizationChange(Number(e.target.value))}
          className="w-full accent-[#FF3D00] cursor-pointer h-1 bg-[#262626]"
        />
      </div>

      {/* Colour Swatches Row */}
      <div className="space-y-1.5 mb-4">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">Colour</span>
        <div className="flex items-center justify-between">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c.name}
              onClick={() => onChangeColor(c.hex)}
              className={`w-6 h-6 border transition-transform ${
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

      {/* Minimalist Add to Pen Box Button */}
      <button
        onClick={handleAddPreset}
        className="w-full py-2 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Add to pen box</span>
      </button>
    </div>
  );
}
