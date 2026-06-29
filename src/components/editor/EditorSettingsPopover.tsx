'use client';

import React, { useEffect, useRef } from 'react';
import { Settings, X, Trash2, Download, Moon, Sun, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface EditorSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  onChangePriority: (p: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  onExportMarkdown: () => void;
  onDeleteNote: () => void;
}

export function EditorSettingsPopover({
  isOpen,
  onClose,
  priority,
  onChangePriority,
  onExportMarkdown,
  onDeleteNote,
}: EditorSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('.editor-settings-trigger')) return;
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed top-14 right-6 z-50 w-[280px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-[#262626] rounded-none shadow-2xl p-4 text-[#FAFAFA] font-sans select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-[#FF3D00]">
          <Settings className="w-4 h-4 stroke-[1.5]" />
          <span className="font-mono text-xs uppercase font-bold tracking-wider text-[#FAFAFA]">
            Note Settings
          </span>
        </div>

        <button onClick={onClose} className="text-[#737373] hover:text-[#FAFAFA] p-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3.5">
        {/* 1. Theme Switcher */}
        <div className="bg-[#0F0F0F] border border-[#262626] p-2.5 flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-[#737373]">Appearance Theme</span>
          <ThemeToggle />
        </div>

        {/* 2. Priority Selector */}
        <div className="bg-[#0F0F0F] border border-[#262626] p-2.5 space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block">
            Note Priority
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
              <button
                key={p}
                onClick={() => onChangePriority(p)}
                className={`py-1 text-[10px] font-mono uppercase transition-all ${
                  priority === p
                    ? 'bg-[#1A1A1A] border border-[#FF3D00] text-[#FF3D00] font-bold'
                    : 'border border-transparent text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Export Options */}
        <div className="bg-[#0F0F0F] border border-[#262626] p-2.5 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block">
            Actions & Export
          </span>
          <button
            onClick={onExportMarkdown}
            className="w-full flex items-center justify-between p-2 border border-[#262626] hover:border-[#FF3D00] bg-[#1A1A1A]/50 text-xs font-mono text-[#FAFAFA] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-[#FF3D00]" />
              <span>Export Markdown</span>
            </span>
          </button>
        </div>

        {/* 4. Delete Note Destructive Action */}
        <div className="pt-1 border-t border-[#262626]">
          <button
            onClick={onDeleteNote}
            className="w-full flex items-center justify-center gap-2 py-2 bg-[#D32F2F]/10 hover:bg-[#D32F2F] border border-[#D32F2F]/40 hover:border-[#D32F2F] text-[#D32F2F] hover:text-[#FAFAFA] text-xs font-mono uppercase font-bold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Note</span>
          </button>
        </div>
      </div>
    </div>
  );
}
