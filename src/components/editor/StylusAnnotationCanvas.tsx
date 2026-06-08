'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Pen, Highlighter, Eraser, Trash2, X, Check, Paintbrush } from 'lucide-react';

interface StylusAnnotationCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  initialDrawingData?: string | null;
  onSaveDrawing: (dataUrl: string | null) => void;
}

export type DrawTool = 'pen' | 'marker' | 'highlighter' | 'eraser';

const COLOR_PALETTE = [
  { name: 'Vermillion', hex: '#FF3D00' },
  { name: 'White', hex: '#FAFAFA' },
  { name: 'Gold', hex: '#FBBC05' },
  { name: 'Emerald', hex: '#34A853' },
  { name: 'Electric Blue', hex: '#4285F4' },
];

export function StylusAnnotationCanvas({
  isOpen,
  onClose,
  initialDrawingData,
  onSaveDrawing,
}: StylusAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#FF3D00');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize Canvas Context & load existing drawing
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to window size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio || rect.width;
    canvas.height = rect.height * window.devicePixelRatio || rect.height;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // If there is initial drawing data URL, load onto canvas
    if (initialDrawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = initialDrawingData;
    }
  }, [isOpen, initialDrawingData]);

  // Handle Pointer Down (Stylus, Touch, Mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);

    // Tool Configurations
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 4;
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor + '66'; // Translucent
      ctx.lineWidth = strokeWidth * 3;
    } else if (activeTool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth * 2;
    } else {
      // Pen
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      // Use stylus pressure if available
      const pressureMultiplier = e.pressure && e.pressure > 0 ? e.pressure * 1.5 : 1;
      ctx.lineWidth = strokeWidth * pressureMultiplier;
    }
  };

  // Handle Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'pen' && e.pressure && e.pressure > 0) {
      ctx.lineWidth = strokeWidth * (e.pressure * 1.5);
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Handle Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
  };

  // Clear Canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Save Drawing
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = hasDrawn ? canvas.toDataURL('image/png') : null;
    onSaveDrawing(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md flex flex-col justify-between p-4 font-sans select-none animate-in fade-in duration-200">
      {/* Top Controls Overlay */}
      <div className="flex items-center justify-between bg-[#0F0F0F] border border-[#262626] px-6 py-3 shadow-2xl z-10">
        <div className="flex items-center gap-3">
          <Paintbrush className="w-5 h-5 text-[#FF3D00]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#FAFAFA] font-bold">
            Stylus & Touch Drawing Canvas
          </span>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] text-xs font-mono uppercase tracking-wider transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 border border-[#262626] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] text-xs font-mono uppercase font-bold tracking-wider transition-colors"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Annotation</span>
          </button>
        </div>
      </div>

      {/* Interactive Canvas Workspace */}
      <div className="relative flex-1 my-4 bg-[#0A0A0A] border border-[#262626] overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full touch-none"
        />
      </div>

      {/* Bottom Floating Stylus Dock */}
      <div className="self-center bg-[#0F0F0F] border border-[#262626] px-6 py-3 flex items-center gap-6 shadow-2xl z-10">
        {/* Tool Selectors */}
        <div className="flex items-center gap-2 border-r border-[#262626] pr-4">
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-2 border transition-colors ${
              activeTool === 'pen'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
            }`}
            title="Fine Pen (Pressure Sensitive)"
          >
            <Pen className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            onClick={() => setActiveTool('marker')}
            className={`p-2 border transition-colors ${
              activeTool === 'marker'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
            }`}
            title="Marker (Bold)"
          >
            <Paintbrush className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 border transition-colors ${
              activeTool === 'highlighter'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
            }`}
            title="Highlighter (Translucent)"
          >
            <Highlighter className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`p-2 border transition-colors ${
              activeTool === 'eraser'
                ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Color Swatches */}
        <div className="flex items-center gap-2 border-r border-[#262626] pr-4">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.name}
              onClick={() => setActiveColor(c.hex)}
              className={`w-6 h-6 rounded-none border transition-transform ${
                activeColor === c.hex ? 'border-[#FAFAFA] scale-110 ring-2 ring-[#FF3D00]' : 'border-[#262626]'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>

        {/* Stroke Width Slider */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[#737373] uppercase tracking-wider">Size: {strokeWidth}px</span>
          <input
            type="range"
            min="1"
            max="12"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-24 accent-[#FF3D00]"
          />
        </div>
      </div>
    </div>
  );
}
