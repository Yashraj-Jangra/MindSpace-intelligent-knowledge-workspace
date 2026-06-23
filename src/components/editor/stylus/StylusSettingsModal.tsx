'use client';

import React from 'react';
import { X, Sliders, Zap, Shield, MousePointer, Volume2 } from 'lucide-react';
import {
  StylusSettings,
  StylusButtonAction,
  PressureCurve,
  SmoothingLevel,
} from '@/lib/stylus/stylus-types';

interface StylusSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StylusSettings;
  onUpdateSettings: (newSettings: Partial<StylusSettings>) => void;
}

const BUTTON_ACTIONS: { label: string; value: StylusButtonAction }[] = [
  { label: 'Toggle Eraser Mode', value: 'toggle_eraser' },
  { label: 'Undo Last Stroke', value: 'undo' },
  { label: 'Redo Stroke', value: 'redo' },
  { label: 'Cycle Color Swatches', value: 'cycle_color' },
  { label: 'Laser Pointer Mode', value: 'laser_pointer' },
  { label: 'Pan / Scroll Workspace', value: 'pan_workspace' },
  { label: 'Clear All Ink', value: 'clear_ink' },
  { label: 'Auto-Convert Shape', value: 'convert_shape' },
  { label: 'Convert Ink to Text', value: 'convert_text' },
];

export function StylusSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: StylusSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-150 font-sans select-none">
      <div className="w-full max-w-md bg-[#0F0F0F] border-l border-[#262626] h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-4">
            <div className="flex items-center gap-2 text-[#FAFAFA]">
              <Sliders className="w-5 h-5 text-[#FF3D00]" />
              <h2 className="font-mono text-sm uppercase tracking-widest font-bold">
                Stylus & Hardware Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 border border-[#262626] text-[#737373] hover:text-[#FAFAFA] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Touch Palm Rejection */}
          <div className="p-4 bg-[#1A1A1A] border border-[#262626] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#FAFAFA] font-bold">
                <Shield className="w-4 h-4 text-[#FF3D00]" />
                <span>Touch Palm Rejection</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enablePalmRejection}
                onChange={(e) => onUpdateSettings({ enablePalmRejection: e.target.checked })}
                className="accent-[#FF3D00] w-4 h-4 cursor-pointer"
              />
            </div>
            <p className="text-[11px] font-mono text-[#737373] leading-relaxed">
              When active, touch gestures are restricted to document panning, preventing accidental hand swipe marks while writing with stylus.
            </p>
          </div>

          {/* Stroke Stabilization & Smoothing */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-mono uppercase text-[#737373] tracking-wider block">
              Stroke Stabilization / Smoothing
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'mild', 'high'] as SmoothingLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdateSettings({ smoothingLevel: level })}
                  className={`py-2 px-3 border text-xs font-mono uppercase tracking-wider transition-colors ${
                    settings.smoothingLevel === level
                      ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00] font-bold'
                      : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Pressure Response Curve */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-mono uppercase text-[#737373] tracking-wider block">
              Stylus Pressure Sensitivity Curve
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['linear', 'soft', 'hard'] as PressureCurve[]).map((curve) => (
                <button
                  key={curve}
                  onClick={() => onUpdateSettings({ pressureCurve: curve })}
                  className={`py-2 px-3 border text-xs font-mono uppercase tracking-wider transition-colors ${
                    settings.pressureCurve === curve
                      ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00] font-bold'
                      : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                  }`}
                >
                  {curve}
                </button>
              ))}
            </div>
          </div>

          {/* Haptics Settings */}
          <div className="p-4 bg-[#1A1A1A] border border-[#262626] space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#FAFAFA] font-bold">
                <Volume2 className="w-4 h-4 text-[#FF3D00]" />
                <span>Web Haptic Vibration</span>
              </div>
              <input
                type="checkbox"
                checked={settings.hapticsEnabled}
                onChange={(e) => onUpdateSettings({ hapticsEnabled: e.target.checked })}
                className="accent-[#FF3D00] w-4 h-4 cursor-pointer"
              />
            </div>
            {settings.hapticsEnabled && (
              <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
                <span className="text-[11px] font-mono text-[#737373]">Intensity:</span>
                <select
                  value={settings.hapticIntensity}
                  onChange={(e) =>
                    onUpdateSettings({
                      hapticIntensity: e.target.value as 'light' | 'medium' | 'strong',
                    })
                  }
                  className="bg-[#0F0F0F] border border-[#262626] text-xs font-mono text-[#FAFAFA] px-2 py-1 focus:outline-none"
                >
                  <option value="light">Light Tick</option>
                  <option value="medium">Medium Click</option>
                  <option value="strong">Strong Pulse</option>
                </select>
              </div>
            )}
          </div>

          {/* Hardware Button & Gesture Mappings */}
          <div className="space-y-4 pt-4 border-t border-[#262626]">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#FAFAFA] font-bold">
              <Zap className="w-4 h-4 text-[#FF3D00]" />
              <span>Hardware Button & Gesture Shortcuts</span>
            </div>

            {/* Barrel Button 1 */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-mono text-[#737373]">Primary Barrel Button:</span>
              <select
                value={settings.barrelButton1Action}
                onChange={(e) =>
                  onUpdateSettings({ barrelButton1Action: e.target.value as StylusButtonAction })
                }
                className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono text-[#FAFAFA] px-2.5 py-1.5 focus:outline-none w-56"
              >
                {BUTTON_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Barrel Button 2 */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-mono text-[#737373]">Secondary Barrel Button:</span>
              <select
                value={settings.barrelButton2Action}
                onChange={(e) =>
                  onUpdateSettings({ barrelButton2Action: e.target.value as StylusButtonAction })
                }
                className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono text-[#FAFAFA] px-2.5 py-1.5 focus:outline-none w-56"
              >
                {BUTTON_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Xiaomi Focus Pen Pro Button */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-mono text-[#737373]">Xiaomi Focus Pro Button:</span>
              <select
                value={settings.xiaomiFocusButtonAction}
                onChange={(e) =>
                  onUpdateSettings({
                    xiaomiFocusButtonAction: e.target.value as StylusButtonAction,
                  })
                }
                className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono text-[#FAFAFA] px-2.5 py-1.5 focus:outline-none w-56"
              >
                {BUTTON_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Double Tap Gesture */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-mono text-[#737373]">Apple Pencil Double Tap:</span>
              <select
                value={settings.doubleTapAction}
                onChange={(e) =>
                  onUpdateSettings({ doubleTapAction: e.target.value as StylusButtonAction })
                }
                className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono text-[#FAFAFA] px-2.5 py-1.5 focus:outline-none w-56"
              >
                {BUTTON_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#262626]">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Save Settings & Close
          </button>
        </div>
      </div>
    </div>
  );
}
