'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Grid,
  Layers,
  PenTool,
  X,
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

  const TEMPLATE_LABELS: Record<PaperTemplate, string> = {
    blank: 'Blank',
    ruled: 'Lined',
    grid: 'Grid',
    dots: 'Dots',
  };

  return (
    <>
      {/* ── Inline flat control row (lives in Row 1 of toolbar) ── */}
      <div className="flex items-center gap-0 h-9 font-sans text-xs select-none w-full">

        {/* Pages Overview Trigger */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            setIsThumbnailsOpen(true);
          }}
          className={`h-full flex items-center gap-1.5 px-3 border-r border-[#1E1E1E] transition-all duration-150 font-mono text-[10px] uppercase tracking-wider ${
            isThumbnailsOpen
              ? 'bg-[#FF3D00]/10 text-[#FF3D00]'
              : 'text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'
          }`}
          title="Open Page Overview"
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Pages</span>
        </button>

        {/* Previous Page */}
        <button
          disabled={activePageIndex === 0}
          onClick={(e) => {
            e.currentTarget.blur();
            onSelectPage(Math.max(0, activePageIndex - 1));
          }}
          className="h-full px-2 border-r border-[#1E1E1E] text-[#737373] disabled:opacity-30 hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-all duration-150"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page Counter */}
        <div className="h-full flex items-center px-3 border-r border-[#1E1E1E] font-mono text-[11px] gap-1 shrink-0">
          <span className="text-[#FAFAFA] font-bold">{activePageIndex + 1}</span>
          <span className="text-[#3a3a3a]">/</span>
          <span className="text-[#3a3a3a]">{totalPages}</span>
        </div>

        {/* Next Page */}
        <button
          disabled={activePageIndex >= totalPages - 1}
          onClick={(e) => {
            e.currentTarget.blur();
            onSelectPage(Math.min(totalPages - 1, activePageIndex + 1));
          }}
          className="h-full px-2 border-r border-[#1E1E1E] text-[#737373] disabled:opacity-30 hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-all duration-150"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Add Page */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            onAddPage();
          }}
          className="h-full flex items-center gap-1 px-3 border-r border-[#1E1E1E] bg-[#FF3D00] hover:bg-[#FF5722] active:bg-[#E64A19] text-[#0A0A0A] font-mono text-[10px] uppercase font-bold transition-all duration-150"
          title="Add New Page"
        >
          <Plus className="w-3 h-3 stroke-[2.5] shrink-0" />
          <span className="hidden md:inline">Add</span>
        </button>

        {/* Duplicate Page */}
        <button
          onClick={() => onDuplicatePage(activePageIndex)}
          className="h-full px-2.5 border-r border-[#1E1E1E] text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-all duration-150"
          title="Duplicate Current Page"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Delete Page */}
        {totalPages > 1 && (
          <button
            onClick={() => onDeletePage(activePageIndex)}
            className="h-full px-2.5 border-r border-[#1E1E1E] text-[#737373] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all duration-150"
            title="Delete Current Page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Separator */}
        <div className="h-full w-px bg-[#1E1E1E] mx-0" />

        {/* Paper Template Selector */}
        <div className="relative h-full">
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              setIsTemplateMenuOpen(!isTemplateMenuOpen);
            }}
            className="h-full flex items-center gap-1.5 px-3 border-r border-[#1E1E1E] text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] font-mono text-[10px] uppercase transition-all duration-150"
            title="Paper Style"
          >
            <Grid className="w-3.5 h-3.5 text-[#FF3D00]/70 shrink-0" />
            <span className="hidden sm:inline">{TEMPLATE_LABELS[activePage?.paperTemplate || 'blank']}</span>
          </button>

          {isTemplateMenuOpen && (
            <div className="absolute left-0 top-full mt-0 z-[80] w-32 bg-[#0A0A0A] border border-[#262626] border-t-[#FF3D00] shadow-2xl overflow-hidden">
              {(['blank', 'ruled', 'grid', 'dots'] as PaperTemplate[]).map((tmpl) => (
                <button
                  key={tmpl}
                  onClick={() => {
                    onChangePaperTemplate(tmpl);
                    setIsTemplateMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 font-mono text-[10px] uppercase transition-all duration-100 ${
                    activePage?.paperTemplate === tmpl
                      ? 'bg-[#FF3D00] text-[#0A0A0A] font-bold'
                      : 'text-[#FAFAFA] hover:bg-[#1A1A1A] hover:text-[#FF3D00]'
                  }`}
                >
                  {TEMPLATE_LABELS[tmpl]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stylus-Only Mode Toggle */}
        <button
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleStylusOnlyMode();
          }}
          className={`h-full flex items-center gap-1.5 px-3 border-r border-[#1E1E1E] font-mono text-[10px] uppercase font-bold transition-all duration-150 ${
            stylusOnlyMode
              ? 'text-[#10b981] bg-[#10b981]/10 border-r-[#10b981]/30'
              : 'text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'
          }`}
          title={stylusOnlyMode ? 'Stylus-Only ON: Finger = scroll, Pen = draw' : 'Mixed Mode: Touch + Pen both draw'}
        >
          <PenTool className="w-3 h-3 shrink-0" />
          <span className="hidden lg:inline">{stylusOnlyMode ? 'Stylus Only' : 'Touch + Pen'}</span>
        </button>
      </div>

      {/* ── Left-Side Page Thumbnail Panel ── */}
      {isThumbnailsOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsThumbnailsOpen(false)}
          />

          {/* Slide-in panel */}
          <div className="fixed left-0 top-0 bottom-0 z-[70] w-72 bg-[#0A0A0A]/98 border-r border-[#262626] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF3D00]" />
                <span className="font-mono text-xs uppercase font-bold text-[#FAFAFA] tracking-wider">
                  Pages — {totalPages}
                </span>
              </div>
              <button
                onClick={() => setIsThumbnailsOpen(false)}
                className="p-1 text-[#737373] hover:text-[#FAFAFA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Page action */}
            <div className="px-3 py-2 border-b border-[#1E1E1E]">
              <button
                onClick={() => {
                  onAddPage();
                  setIsThumbnailsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#FF3D00] hover:bg-[#FF5722] active:bg-[#E64A19] text-[#0A0A0A] font-mono text-[10px] uppercase font-bold transition-all duration-150"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Add New Page
              </button>
            </div>

            {/* Thumbnail grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectPage(idx);
                    setIsThumbnailsOpen(false);
                  }}
                  className={`relative cursor-pointer border transition-all duration-150 group ${
                    idx === activePageIndex
                      ? 'border-[#FF3D00] bg-[#0F0F0F] shadow-lg shadow-[#FF3D00]/10'
                      : 'border-[#262626] bg-[#0D0D0D] hover:border-[#404040] hover:bg-[#0F0F0F]'
                  }`}
                >
                  {/* Thumbnail card */}
                  <div className="p-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-mono text-[10px] uppercase font-bold ${idx === activePageIndex ? 'text-[#FF3D00]' : 'text-[#737373]'}`}>
                        Page {idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] text-[#3a3a3a] uppercase">{p.paperTemplate || 'blank'}</span>
                        {idx === activePageIndex && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3D00]" />
                        )}
                      </div>
                    </div>

                    {/* Content preview */}
                    <div className="h-20 bg-[#0A0A0A] border border-[#1E1E1E] p-2 overflow-hidden">
                      <div className="font-mono text-[8px] text-[#3a3a3a] leading-relaxed line-clamp-6">
                        {p.content?.replace(/<[^>]*>?/gm, '').trim() || '— Empty page —'}
                      </div>
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-[9px] text-[#3a3a3a]">
                        {p.strokes?.length || 0} strokes
                      </span>
                      {/* Per-page actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicatePage(idx);
                          }}
                          className="p-1 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-all"
                          title="Duplicate page"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {totalPages > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePage(idx);
                            }}
                            className="p-1 text-[#737373] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                            title="Delete page"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
