"use client";

import React, { useState, useEffect } from "react";
import {
  Keyboard,
  X,
  Command,
  PenTool,
  Layout,
  FileText,
  CheckSquare,
} from "lucide-react";

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea or contentEditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest(".tiptap");

      if (!isInput && e.key === "?") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mindspace:open-shortcuts-hud", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(
        "mindspace:open-shortcuts-hud",
        handleCustomOpen,
      );
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: "Global Navigation",
      icon: <Command className="w-4 h-4 text-[#FF3D00]" />,
      shortcuts: [
        { key: "⌘ K / Ctrl+K", desc: "Open Command Palette & Global Search" },
        { key: "?", desc: "Open Keyboard Shortcuts HUD" },
        { key: "Esc", desc: "Dismiss active dialogs & modals" },
      ],
    },
    {
      title: "Rich Note Editor",
      icon: <FileText className="w-4 h-4 text-[#3B82F6]" />,
      shortcuts: [
        { key: "/", desc: "Open Slash Commands (Headings, Tables, Tasks)" },
        { key: "⌘ B", desc: "Bold text formatting" },
        { key: "⌘ I", desc: "Italic text formatting" },
        { key: "⌘ U", desc: "Underline text formatting" },
        { key: "⌘ Z / ⌘ ⇧ Z", desc: "Undo / Redo text edits" },
      ],
    },
    {
      title: "Stylus & Digital Ink",
      icon: <PenTool className="w-4 h-4 text-[#FF3D00]" />,
      shortcuts: [
        { key: "P", desc: "Switch to Pen tool (Fountain, Ballpoint, Pencil)" },
        { key: "H", desc: "Switch to Highlighter tool" },
        { key: "E", desc: "Switch to Eraser tool (Stroke, Pixel, Lasso)" },
        { key: "S", desc: "Switch to Lasso / Multi-Element Select" },
        { key: "R", desc: "Toggle Digital Straight-Edge Ruler Guide" },
        {
          key: "Hold Pen",
          desc: "Auto-Shape Snap (Circles, Rectangles, Lines)",
        },
      ],
    },
    {
      title: "MindSpace Canvas",
      icon: <Layout className="w-4 h-4 text-[#10B981]" />,
      shortcuts: [
        { key: "Space + Drag", desc: "Pan infinite canvas" },
        { key: "Scroll / Pinch", desc: "Smooth zoom in / zoom out" },
        { key: "+ Frame", desc: "Add visual group container frame" },
        { key: "Auto Layout", desc: "Trigger ELK.js hierarchical positioning" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0F0F0F] border border-[#262626] relative flex flex-col max-h-[85vh] font-sans shadow-2xl">
        {/* Top Accent Bar */}
        <div className="h-1 w-full bg-[#FF3D00] absolute top-0 left-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FF3D00] flex items-center justify-center text-[#0A0A0A]">
              <Keyboard className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-sans font-bold text-sm text-[#FAFAFA] uppercase tracking-wider">
              Keyboard Shortcuts Cheat Sheet
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[#1A1A1A] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {shortcutSections.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#FAFAFA] font-bold pb-1 border-b border-[#1E1E1E]">
                {section.icon}
                <span>{section.title}</span>
              </div>
              <div className="space-y-2">
                {section.shortcuts.map((sc, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-[#737373] text-[11px]">
                      {sc.desc}
                    </span>
                    <kbd className="px-2 py-0.5 bg-[#141414] border border-[#262626] font-mono text-[10px] text-[#FF3D00] shrink-0">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#262626] bg-[#0A0A0A] flex items-center justify-between font-mono text-[10px] text-[#737373]">
          <span>
            Tip: Press{" "}
            <kbd className="px-1.5 py-0.5 bg-[#141414] border border-[#262626] text-[#FAFAFA]">
              ?
            </kbd>{" "}
            anywhere to toggle this guide
          </span>
          <span className="text-[#FF3D00] font-bold">
            MINDSPACE PRODUCTIVITY
          </span>
        </div>
      </div>
    </div>
  );
}
