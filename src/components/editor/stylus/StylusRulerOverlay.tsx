"use client";

import React, { useState, useRef } from "react";
import { X, Move } from "lucide-react";

interface StylusRulerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StylusRulerOverlay({
  isOpen,
  onClose,
}: StylusRulerOverlayProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 200,
    y: 300,
  });
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release error
    }
  };

  const rotateBy = (deg: number) => {
    setAngle((prev) => (prev + deg) % 360);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "center center",
        zIndex: 85,
      }}
      className="select-none font-mono"
    >
      {/* Infinite Laser Straight-Edge Guide Line */}
      <div className="absolute -left-[500px] -right-[500px] top-0 h-[1px] bg-[#FF3D00]/40 pointer-events-none" />

      {/* Main Ruler Body */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-[500px] h-[80px] bg-[#0F0F0F]/90 backdrop-blur-md border border-[#FF3D00] shadow-2xl relative cursor-grab active:cursor-grabbing flex flex-col justify-between p-2"
      >
        {/* Top Tick Marks (Metric Millimeters) */}
        <div className="flex justify-between items-start w-full px-1">
          {Array.from({ length: 26 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`w-[1px] bg-[#FAFAFA] ${
                  i % 5 === 0 ? "h-3.5 bg-[#FF3D00]" : "h-1.5 opacity-40"
                }`}
              />
              {i % 5 === 0 && (
                <span className="text-[7px] text-[#737373] mt-0.5">
                  {i * 2}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Center Control Panel */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#0A0A0A]/80 border border-[#262626]">
          <div className="flex items-center gap-2">
            <Move className="w-3 h-3 text-[#FF3D00]" />
            <span className="text-[9px] uppercase font-bold text-[#FAFAFA]">
              Ruler Guide
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#FF3D00] font-bold px-1.5 py-0.5 bg-[#141414] border border-[#262626]">
              {angle}°
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                rotateBy(-15);
              }}
              className="px-1.5 py-0.5 bg-[#141414] hover:bg-[#262626] text-[#FAFAFA] text-[9px] border border-[#262626]"
              title="Rotate -15 deg"
            >
              -15°
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                rotateBy(15);
              }}
              className="px-1.5 py-0.5 bg-[#141414] hover:bg-[#262626] text-[#FAFAFA] text-[9px] border border-[#262626]"
              title="Rotate +15 deg"
            >
              +15°
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAngle(0);
              }}
              className="px-1.5 py-0.5 bg-[#141414] hover:bg-[#262626] text-[#FAFAFA] text-[9px] border border-[#262626]"
              title="Reset Angle"
            >
              0°
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 text-[#737373] hover:text-[#FF3D00] transition-colors"
            title="Close Ruler"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Tick Marks */}
        <div className="flex justify-between items-end w-full px-1">
          {Array.from({ length: 26 }).map((_, i) => (
            <div
              key={i}
              className={`w-[1px] bg-[#FAFAFA] ${
                i % 5 === 0 ? "h-3.5 bg-[#FF3D00]" : "h-1.5 opacity-40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
