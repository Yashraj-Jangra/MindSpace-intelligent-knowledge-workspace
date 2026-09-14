"use client";

import React from "react";
import {
  Undo,
  Redo,
  Pen,
  Highlighter,
  Eraser,
  MousePointer,
  Sparkles,
  Type,
  Compass,
} from "lucide-react";
import { StylusTool, StylusSettings } from "@/lib/stylus/stylus-types";

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
  onActivateStylusMode: () => void;
  onDeactivateStylusMode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isSidebarVisible?: boolean;
  isRulerOpen?: boolean;
  onToggleRuler?: () => void;
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
  onActivateStylusMode,
  onDeactivateStylusMode,
  onUndo,
  onRedo,
  isSidebarVisible = true,
  isRulerOpen = false,
  onToggleRuler,
}: VerticalStylusSidebarProps) {
  if (!isSidebarVisible) return null;

  return (
    <aside className="fixed top-14 left-0 bottom-0 z-30 w-12 bg-[#0F0F0F] border-r border-[#262626] flex flex-col justify-between items-center py-3 font-sans select-none vertical-stylus-sidebar">
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
        {/* Text Mode Toggle (Type into Note) */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            onDeactivateStylusMode();
          }}
          className={`p-2 border transition-colors ${
            !settings.isStylusModeActive
              ? "border-[#3b82f6] bg-[#1A1A1A] text-[#3b82f6]"
              : "border-transparent text-[#737373] hover:text-[#FAFAFA]"
          }`}
          title="Text Edit Mode (Type Text into Note)"
        >
          <Type className="w-4 h-4 stroke-[2]" />
        </button>

        <div className="w-6 h-px bg-[#262626] my-0.5" />

        {/* Pen Tool (1st click selects tool, 2nd click opens popover settings) */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            if (activeTool === "pen" && settings.isStylusModeActive) {
              onTogglePenPopover();
            } else {
              onActivateStylusMode();
              onSelectTool("pen");
              onClosePenPopover();
            }
          }}
          className={`p-2 border transition-colors ${
            settings.isStylusModeActive && activeTool === "pen"
              ? "border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]"
              : "border-transparent text-[#737373] hover:text-[#FAFAFA]"
          }`}
          title={
            settings.isStylusModeActive && activeTool === "pen"
              ? "Click again for Pen Settings"
              : "Switch to Pen Tool"
          }
        >
          <Pen className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Highlighter Tool (1st click selects tool, 2nd click opens popover settings) */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            if (activeTool === "highlighter" && settings.isStylusModeActive) {
              onToggleHighlighterPopover();
            } else {
              onActivateStylusMode();
              onSelectTool("highlighter");
              onClosePenPopover();
            }
          }}
          className={`p-2 border transition-colors ${
            settings.isStylusModeActive && activeTool === "highlighter"
              ? "border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]"
              : "border-transparent text-[#737373] hover:text-[#FAFAFA]"
          }`}
          title={
            settings.isStylusModeActive && activeTool === "highlighter"
              ? "Click again for Highlighter Settings"
              : "Switch to Highlighter Tool"
          }
        >
          <Highlighter className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Eraser Tool (1st click selects tool, 2nd click opens popover settings) */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            if (activeTool === "eraser" && settings.isStylusModeActive) {
              onToggleEraserPopover();
            } else {
              onActivateStylusMode();
              onSelectTool("eraser");
              onClosePenPopover();
            }
          }}
          className={`p-2 border transition-colors ${
            settings.isStylusModeActive && activeTool === "eraser"
              ? "border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]"
              : "border-transparent text-[#737373] hover:text-[#FAFAFA]"
          }`}
          title={
            settings.isStylusModeActive && activeTool === "eraser"
              ? "Click again for Eraser Settings"
              : "Switch to Eraser Tool"
          }
        >
          <Eraser className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Lasso Select Tool (1st click selects tool, 2nd click opens popover settings) */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            if (activeTool === "select" && settings.isStylusModeActive) {
              onToggleLassoPopover();
            } else {
              onActivateStylusMode();
              onSelectTool("select");
              onClosePenPopover();
            }
          }}
          className={`p-2 border transition-colors ${
            settings.isStylusModeActive && activeTool === "select"
              ? "border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]"
              : "border-transparent text-[#737373] hover:text-[#FAFAFA]"
          }`}
          title={
            settings.isStylusModeActive && activeTool === "select"
              ? "Click again for Lasso Settings"
              : "Switch to Lasso Select Tool"
          }
        >
          <MousePointer className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Auto-Shape Recognition Settings */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            onActivateStylusMode();
            onToggleShapePopover();
          }}
          className={`p-2 border transition-colors ${
            settings.isStylusModeActive && settings.autoShapeRecognition
              ? "border-[#FF3D00] text-[#FF3D00]"
              : "border-transparent text-[#737373] hover:text-[#FAFAFA]"
          }`}
          title="Auto-Shape Settings (Hold Timer & Tool Scope)"
        >
          <Sparkles className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Geometric Ruler Toggle */}
        {onToggleRuler && (
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              onActivateStylusMode();
              onToggleRuler();
            }}
            className={`p-2 border transition-colors ${
              isRulerOpen
                ? "border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]"
                : "border-transparent text-[#737373] hover:text-[#FAFAFA]"
            }`}
            title="Digital Geometric Straight-Edge Ruler Guide"
          >
            <Compass className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-[#262626] w-full px-1">
        <div
          className="w-2 h-2 rounded-full bg-[#FF3D00]"
          title="Stylus Connected"
        />
      </div>
    </aside>
  );
}
