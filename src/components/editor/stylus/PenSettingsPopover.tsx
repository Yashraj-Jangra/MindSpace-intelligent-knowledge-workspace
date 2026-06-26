'use client';

import React from 'react';
import { Camera, Crop, Mic, X } from 'lucide-react';
import {
  PenSubtype,
  LineType,
  SmoothingLevel,
  StylusSettings,
} from '@/lib/stylus/stylus-types';
import {
  FountainNibIcon,
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
  fountain: 'Fountain Pen',
  ballpoint: 'Ballpoint Pen',
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
}: PenSettingsPopoverProps) {
  if (!isOpen) return null;

  const stabilizationPercent =
    settings.smoothingLevel === 'high' ? 80 : settings.smoothingLevel === 'mild' ? 40 : 0;

  const handleStabilizationChange = (val: number) => {
    const level: SmoothingLevel = val >= 60 ? 'high' : val >= 20 ? 'mild' : 'none';
    onUpdateSettings({ smoothingLevel: level });
  };

  const graphiteDensityPercent = Math.round((settings.perPenSettings.pencilDensity ?? 0.85) * 100);

  const handleGraphiteDensityChange = (val: number) => {
    onUpdateSettings({
      perPenSettings: {
        ...settings.perPenSettings,
        pencilDensity: val / 100,
      },
    });
  };

  return (
    <div className="fixed top-14 left-16 z-50 w-[340px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#262626] rounded-none shadow-2xl p-4 text-[#FAFAFA] font-sans select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Top Header */}
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

      {/* 3 Pen Subtype Selector Bar (Equal 3-Grid Layout) */}
      <div className="grid grid-cols-3 gap-2 bg-[#0F0F0F] border border-[#262626] p-2 mb-4">
        {/* 1. Fountain Pen */}
        <button
          onClick={() => {
            onSelectPenSubtype('fountain');
            onChangeLineType('solid');
          }}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            activePenSubtype === 'fountain'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Fountain Pen (Pressure & Speed Sensitive)"
        >
          <FountainNibIcon className="w-5 h-8 mb-1" isSelected={activePenSubtype === 'fountain'} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FAFAFA]">Fountain</span>
        </button>

        {/* 2. Ballpoint Pen */}
        <button
          onClick={() => onSelectPenSubtype('ballpoint')}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            activePenSubtype === 'ballpoint'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Ballpoint Pen (Same Width All The Way)"
        >
          <BallpointNibIcon className="w-5 h-8 mb-1" isSelected={activePenSubtype === 'ballpoint'} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FAFAFA]">Ballpoint</span>
        </button>

        {/* 3. Textured Pencil */}
        <button
          onClick={() => {
            onSelectPenSubtype('pencil');
            onChangeLineType('solid');
          }}
          className={`flex flex-col items-center justify-center p-2 transition-all ${
            activePenSubtype === 'pencil'
              ? 'bg-[#1A1A1A] border border-[#FF3D00]'
              : 'border border-transparent hover:border-[#262626]'
          }`}
          title="Textured Pencil (Pressure Darkness Shading)"
        >
          <PencilNibIcon className="w-5 h-8 mb-1" isSelected={activePenSubtype === 'pencil'} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FAFAFA]">Pencil</span>
        </button>
      </div>

      {/* Dynamic Settings Area (Strictly Maintained Container Height for Zero Layout Shifting!) */}
      <div className="min-h-[70px] flex flex-col justify-center mb-3.5">
        {activePenSubtype === 'ballpoint' && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">
              Line Style (With Previews)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* Normal / Solid */}
              <button
                onClick={() => onChangeLineType('solid')}
                className={`h-9 border px-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                  lineType === 'solid'
                    ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                <svg className="w-full h-2" viewBox="0 0 60 6" fill="none">
                  <line x1="0" y1="3" x2="60" y2="3" stroke={lineType === 'solid' ? '#FF3D00' : '#FAFAFA'} strokeWidth="2" />
                </svg>
                <span className="text-[9px] font-mono uppercase">Solid</span>
              </button>

              {/* Dashed */}
              <button
                onClick={() => onChangeLineType('dashed')}
                className={`h-9 border px-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                  lineType === 'dashed'
                    ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                <svg className="w-full h-2" viewBox="0 0 60 6" fill="none">
                  <line
                    x1="0"
                    y1="3"
                    x2="60"
                    y2="3"
                    stroke={lineType === 'dashed' ? '#FF3D00' : '#FAFAFA'}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                </svg>
                <span className="text-[9px] font-mono uppercase">Dashed</span>
              </button>

              {/* Dotted */}
              <button
                onClick={() => onChangeLineType('dotted')}
                className={`h-9 border px-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                  lineType === 'dotted'
                    ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                <svg className="w-full h-2" viewBox="0 0 60 6" fill="none">
                  <line
                    x1="0"
                    y1="3"
                    x2="60"
                    y2="3"
                    stroke={lineType === 'dotted' ? '#FF3D00' : '#FAFAFA'}
                    strokeWidth="2"
                    strokeDasharray="2 4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[9px] font-mono uppercase">Dotted</span>
              </button>
            </div>
          </div>
        )}

        {activePenSubtype === 'pencil' && (
          <div className="space-y-1 bg-[#0F0F0F] border border-[#262626] p-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#737373] uppercase">Pencil Texture Grain</span>
              <span className="text-[#FF3D00] font-bold">{graphiteDensityPercent}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={graphiteDensityPercent}
              onChange={(e) => handleGraphiteDensityChange(Number(e.target.value))}
              className="w-full accent-[#FF3D00] cursor-pointer h-1 bg-[#262626]"
            />
          </div>
        )}

        {activePenSubtype === 'fountain' && (
          <div className="bg-[#0F0F0F] border border-[#262626] p-2.5 text-[11px] font-mono text-[#737373] flex items-center justify-between">
            <span>Flex Dynamics:</span>
            <span className="text-[#FF3D00] font-bold">Pressure & Velocity Sensitive</span>
          </div>
        )}
      </div>

      {/* Thickness Slider */}
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

      {/* Stroke Stabilization Slider */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#737373] uppercase">Stroke Stabilization</span>
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
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block">Colour</span>
        <div className="flex items-center justify-between">
          {COLOR_SWATCHES.map((c) => (
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
