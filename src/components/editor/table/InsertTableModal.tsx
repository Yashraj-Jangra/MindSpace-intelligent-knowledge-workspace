'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Grid, X } from 'lucide-react';

interface InsertTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}

export function InsertTableModal({ isOpen, onClose, onInsert }: InsertTableModalProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  // Visual preview hover state
  const [hoverRow, setHoverRow] = useState(rows);
  const [hoverCol, setHoverCol] = useState(cols);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRows(3);
      setCols(3);
      setHoverRow(3);
      setHoverCol(3);
      setTimeout(() => firstInputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') handleInsert();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rows, cols]);

  const handleInsert = () => {
    const r = Math.max(1, Math.min(20, rows));
    const c = Math.max(1, Math.min(20, cols));
    onInsert(r, c);
    onClose();
  };

  if (!isOpen) return null;

  const PREVIEW_ROWS = 8;
  const PREVIEW_COLS = 10;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-[#0F0F0F] border border-[#FF3D00] shadow-2xl font-mono select-none"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Grid className="w-3.5 h-3.5 text-[#FF3D00]" strokeWidth={1.5} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#FAFAFA]">
              Insert Table
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#FAFAFA] transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid Preview */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-[9px] text-[#737373] uppercase tracking-wider mb-2">
            {hoverRow} × {hoverCol} — hover to select
          </div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${PREVIEW_COLS}, 1fr)` }}
            onMouseLeave={() => { setHoverRow(rows); setHoverCol(cols); }}
          >
            {Array.from({ length: PREVIEW_ROWS }, (_, r) =>
              Array.from({ length: PREVIEW_COLS }, (_, c) => {
                const active = r < hoverRow && c < hoverCol;
                const selected = r < rows && c < cols;
                return (
                  <div
                    key={`${r}-${c}`}
                    className="w-full aspect-square transition-colors duration-75 cursor-pointer"
                    style={{
                      backgroundColor: active ? '#FF3D00' : selected ? '#FF3D00/20' : '#1A1A1A',
                      border: '1px solid',
                      borderColor: active ? '#FF3D00' : '#262626',
                      opacity: active ? 1 : selected ? 0.4 : 1,
                    }}
                    onMouseEnter={() => {
                      setHoverRow(r + 1);
                      setHoverCol(c + 1);
                    }}
                    onClick={() => {
                      setRows(r + 1);
                      setCols(c + 1);
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Number inputs */}
        <div className="flex gap-3 px-4 pb-4 pt-2">
          <div className="flex-1">
            <label className="text-[9px] text-[#737373] uppercase tracking-wider block mb-1">Rows</label>
            <input
              ref={firstInputRef}
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => {
                const v = Math.max(1, Math.min(20, Number(e.target.value)));
                setRows(v);
                setHoverRow(v);
              }}
              className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] text-sm px-3 py-2 outline-none text-center font-mono transition-colors"
            />
          </div>
          <div className="flex items-end pb-2 text-[#737373] text-sm">×</div>
          <div className="flex-1">
            <label className="text-[9px] text-[#737373] uppercase tracking-wider block mb-1">Columns</label>
            <input
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={(e) => {
                const v = Math.max(1, Math.min(20, Number(e.target.value)));
                setCols(v);
                setHoverCol(v);
              }}
              className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] text-sm px-3 py-2 outline-none text-center font-mono transition-colors"
            />
          </div>
        </div>

        {/* Insert Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleInsert}
            className="w-full py-2.5 bg-[#FF3D00] hover:bg-[#FF5722] active:bg-[#E64A19] text-[#0A0A0A] text-[11px] font-bold uppercase tracking-widest transition-colors"
          >
            Insert {rows} × {cols} Table
          </button>
        </div>
      </div>
    </>
  );
}
