'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Grid,
  FileText,
  LayoutGrid,
  MoreVertical,
  Layers,
  Sparkles,
  PenTool,
} from 'lucide-react';
import { PaperTemplate, NotePageData } from '@/lib/stylus/stylus-types';

interface PageNavigationBarProps {
  pages: NotePageData[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onChangePaperTemplate: (template: PaperTemplate) => void;
  stylusOnlyMode: boolean;
  onToggleStylusOnlyMode: () => void;
}

export function PageNavigationBar({
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onChangePaperTemplate,
  stylusOnlyMode,
  onToggleStylusOnlyMode,
}: PageNavigationBarProps) {
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);

  const activePage = pages[activePageIndex] || pages[0];
  const totalPages = pages.length;

  return (
    <div className="bg-[#0F0F0F] border-b border-[#262626] px-4 py-2 flex items-center justify-between font-sans text-xs select-none sticky top-14 z-40">
      {/* Left: Page Counter & Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 border transition-colors ${
            isThumbnailsOpen ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Toggle Page Thumbnails Overview"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider hidden sm:inline">Pages</span>
        </button>

        <div className="h-4 w-px bg-[#262626]" />

        {/* Previous Page */}
        <button
          disabled={activePageIndex === 0}
          onClick={() => onSelectPage(Math.max(0, activePageIndex - 1))}
          className="p-1 border border-[#262626] disabled:opacity-40 hover:border-[#FAFAFA] text-[#FAFAFA] transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Counter Indicator */}
        <div className="font-mono text-xs text-[#FAFAFA] font-bold px-2">
          <span>Page {activePageIndex + 1}</span>
          <span className="text-[#737373] font-normal"> / {totalPages}</span>
        </div>

        {/* Next Page */}
        <button
          disabled={activePageIndex >= totalPages - 1}
          onClick={() => onSelectPage(Math.min(totalPages - 1, activePageIndex + 1))}
          className="p-1 border border-[#262626] disabled:opacity-40 hover:border-[#FAFAFA] text-[#FAFAFA] transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Add Page Button */}
        <button
          onClick={onAddPage}
          className="flex items-center gap-1 px-3 py-1 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold transition-colors ml-1"
          title="Add New Blank Page"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Add Page</span>
        </button>
      </div>

      {/* Right: Paper Template Picker & Stylus Only Mode Toggle */}
      <div className="flex items-center gap-2">
        {/* Strict Stylus Only Mode Toggle */}
        <button
          onClick={onToggleStylusOnlyMode}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-[11px] uppercase font-bold transition-all ${
            stylusOnlyMode
              ? 'border-[#10b981] bg-[#10b981]/15 text-[#10b981]'
              : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
          }`}
          title="Strict Stylus-Only Mode: Finger touch scrolls, stylus writes"
        >
          <PenTool className="w-3 h-3" />
          <span className="hidden md:inline">{stylusOnlyMode ? 'Stylus Only ON' : 'Touch + Stylus'}</span>
        </button>

        <div className="h-4 w-px bg-[#262626]" />

        {/* Paper Template Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-[#262626] hover:border-[#FF3D00] text-[#FAFAFA] font-mono text-[11px] uppercase transition-colors"
            title="Paper Background Grid Style"
          >
            <Grid className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span className="capitalize">{activePage?.paperTemplate || 'blank'}</span>
          </button>

          {isTemplateMenuOpen && (
            <div className="absolute right-0 top-8 z-[80] w-40 bg-[#0A0A0A] border border-[#262626] shadow-2xl p-1 font-mono text-xs space-y-1">
              {(['blank', 'ruled', 'grid', 'dots'] as PaperTemplate[]).map((tmpl) => (
                <button
                  key={tmpl}
                  onClick={() => {
                    onChangePaperTemplate(tmpl);
                    setIsTemplateMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 uppercase transition-colors ${
                    activePage?.paperTemplate === tmpl
                      ? 'bg-[#FF3D00] text-[#0A0A0A] font-bold'
                      : 'text-[#FAFAFA] hover:bg-[#1A1A1A]'
                  }`}
                >
                  {tmpl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page Actions: Duplicate / Delete */}
        <button
          onClick={() => onDuplicatePage(activePageIndex)}
          className="p-1.5 border border-[#262626] hover:border-[#FAFAFA] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          title="Duplicate Current Page"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {totalPages > 1 && (
          <button
            onClick={() => onDeletePage(activePageIndex)}
            className="p-1.5 border border-[#262626] hover:border-[#D32F2F] text-[#737373] hover:text-[#D32F2F] transition-colors"
            title="Delete Current Page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Slide-Out Page Thumbnails Drawer Overlay */}
      {isThumbnailsOpen && (
        <div className="fixed inset-x-0 top-24 z-[65] bg-[#0A0A0A]/95 border-b border-[#262626] p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top duration-200">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-4">
              <span className="font-mono text-xs uppercase font-bold text-[#FF3D00] tracking-wider">
                Page Overview & Thumbnails
              </span>
              <button
                onClick={() => setIsThumbnailsOpen(false)}
                className="font-mono text-xs text-[#737373] hover:text-[#FAFAFA]"
              >
                Close ✕
              </button>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPage(idx);
                    setIsThumbnailsOpen(false);
                  }}
                  className={`w-36 h-48 shrink-0 bg-[#0F0F0F] border cursor-pointer p-2 flex flex-col justify-between transition-all relative ${
                    idx === activePageIndex ? 'border-[#FF3D00] ring-2 ring-[#FF3D00]/20' : 'border-[#262626] hover:border-[#737373]'
                  }`}
                >
                  <div className="font-mono text-[10px] text-[#737373] uppercase flex justify-between">
                    <span>Page {idx + 1}</span>
                    <span>{p.paperTemplate}</span>
                  </div>
                  <div className="text-[9px] text-[#737373] line-clamp-4 font-mono leading-tight">
                    {p.content?.replace(/<[^>]*>?/gm, '') || 'Blank page...'}
                  </div>
                  <div className="font-mono text-[9px] text-[#FF3D00] text-right">
                    {p.strokes?.length || 0} strokes
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
