'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  GripVertical,
  Plus,
  Trash2,
  Palette,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import {
  type CanvasTableTheme,
  type CellData,
  DEFAULT_CANVAS_TABLE_THEME,
} from './CanvasTableExtension';

// ── Helpers ────────────────────────────────────────────────────────────────

function parseCellData(raw: string | null, rows: number, cols: number): CellData {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as CellData;
    } catch {/* fall through */}
  }
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r === 0 ? `Header ${c + 1}` : ''))
  );
}

function parseTheme(raw: string | null): CanvasTableTheme {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_CANVAS_TABLE_THEME, ...parsed };
      }
    } catch {/* fall through */}
  }
  return { ...DEFAULT_CANVAS_TABLE_THEME };
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface ColorPickerRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorPickerRow({ label, value, onChange }: ColorPickerRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#262626'}
          onChange={(e) => onChange(e.target.value)}
          className="w-5 h-5 cursor-pointer border border-[#404040] bg-transparent p-0"
          style={{ borderRadius: 0 }}
        />
        <span className="text-[9px] font-mono text-[#404040]">{value}</span>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CanvasTable({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const attrs = node.attrs;
  const rows: number = attrs.rows ?? 3;
  const cols: number = attrs.cols ?? 3;

  // ── Local State ────────────────────────────────────────────────────────
  const [cells, setCells] = useState<CellData>(() =>
    parseCellData(attrs.cellData, rows, cols)
  );
  const [theme, setTheme] = useState<CanvasTableTheme>(() => parseTheme(attrs.theme));
  const [posX, setPosX] = useState<number>(attrs.posX ?? 0);
  const [posY, setPosY] = useState<number>(attrs.posY ?? 0);
  const [width, setWidth] = useState<number>(attrs.width ?? 560);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // ── Sync local state from TipTap attrs (covers undo/redo) ─────────────
  // We track a ref of the last attrs we wrote ourselves to avoid feedback loops
  const lastFlushedCellData = useRef<string | null>(attrs.cellData);

  useEffect(() => {
    // If attrs.cellData changed from outside (e.g. undo), re-sync our state
    if (attrs.cellData !== lastFlushedCellData.current) {
      lastFlushedCellData.current = attrs.cellData;
      setCells(parseCellData(attrs.cellData, attrs.rows ?? 3, attrs.cols ?? 3));
    }
    if (attrs.theme) setTheme(parseTheme(attrs.theme));
    if (attrs.posX !== undefined) setPosX(attrs.posX);
    if (attrs.posY !== undefined) setPosY(attrs.posY);
    if (attrs.width !== undefined) setWidth(attrs.width);
  }, [attrs.cellData, attrs.theme, attrs.posX, attrs.posY, attrs.width, attrs.rows, attrs.cols]);


  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const resizeStart = useRef({ x: 0, w: 0 });

  // ── Sync back to TipTap attrs when our state changes ──────────────────
  const flushAttrs = useCallback(
    (
      nextCells: CellData,
      nextTheme: CanvasTableTheme,
      nextPosX: number,
      nextPosY: number,
      nextWidth: number
    ) => {
      updateAttributes({
        rows: nextCells.length,
        cols: nextCells[0]?.length ?? 0,
        cellData: JSON.stringify(nextCells),
        theme: JSON.stringify(nextTheme),
        posX: nextPosX,
        posY: nextPosY,
        width: nextWidth,
      });
    },
    [updateAttributes]
  );

  // ── Drag ───────────────────────────────────────────────────────────────
  const handleDragPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: posX, py: posY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosX(dragStart.current.px + dx);
    setPosY(dragStart.current.py + dy);
  };

  const handleDragPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const nextX = dragStart.current.px + dx;
    const nextY = dragStart.current.py + dy;
    setPosX(nextX);
    setPosY(nextY);
    flushAttrs(cells, theme, nextX, nextY, width);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const handleResetPosition = () => {
    setPosX(0);
    setPosY(0);
    flushAttrs(cells, theme, 0, 0, width);
  };

  // ── Resize ─────────────────────────────────────────────────────────────
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, w: width };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const dw = e.clientX - resizeStart.current.x;
    const next = Math.max(280, resizeStart.current.w + dw);
    setWidth(next);
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);
    const dw = e.clientX - resizeStart.current.x;
    const next = Math.max(280, resizeStart.current.w + dw);
    setWidth(next);
    flushAttrs(cells, theme, posX, posY, next);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // ── Row / Col Operations ───────────────────────────────────────────────
  const insertRowAfter = (rowIdx: number) => {
    const numCols = cells[0]?.length ?? cols;
    const newRow = Array(numCols).fill('');
    const next = [...cells.slice(0, rowIdx + 1), newRow, ...cells.slice(rowIdx + 1)];
    setCells(next);
    flushAttrs(next, theme, posX, posY, width);
  };

  const insertRowBefore = (rowIdx: number) => {
    const numCols = cells[0]?.length ?? cols;
    const newRow = Array(numCols).fill('');
    const next = [...cells.slice(0, rowIdx), newRow, ...cells.slice(rowIdx)];
    setCells(next);
    flushAttrs(next, theme, posX, posY, width);
  };

  const deleteRow = (rowIdx: number) => {
    if (cells.length <= 1) return;
    const next = cells.filter((_, i) => i !== rowIdx);
    setCells(next);
    flushAttrs(next, theme, posX, posY, width);
  };

  const insertColAfter = (colIdx: number) => {
    const next = cells.map((row) => [
      ...row.slice(0, colIdx + 1),
      '',
      ...row.slice(colIdx + 1),
    ]);
    setCells(next);
    flushAttrs(next, theme, posX, posY, width);
  };

  const insertColBefore = (colIdx: number) => {
    const next = cells.map((row) => [
      ...row.slice(0, colIdx),
      '',
      ...row.slice(colIdx),
    ]);
    setCells(next);
    flushAttrs(next, theme, posX, posY, width);
  };

  const deleteCol = (colIdx: number) => {
    if ((cells[0]?.length ?? 0) <= 1) return;
    const next = cells.map((row) => row.filter((_, i) => i !== colIdx));
    setCells(next);
    flushAttrs(next, theme, posX, posY, width);
  };

  // ── Cell Content Editing ───────────────────────────────────────────────
  const handleCellInput = (rowIdx: number, colIdx: number, value: string) => {
    const next = cells.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row
    );
    setCells(next);
    flushAttrs(next, theme, posX, posY, width);
  };

  // ── Theme Changes ──────────────────────────────────────────────────────
  const updateTheme = (patch: Partial<CanvasTableTheme>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    flushAttrs(cells, next, posX, posY, width);
  };

  // ── Column width distribution ──────────────────────────────────────────
  const numCols = useMemo(() => cells[0]?.length ?? cols, [cells, cols]);
  const colWidth = useMemo(() => Math.floor(width / numCols), [width, numCols]);

  // ── Context: selected row/col for toolbar (hover state) ───────────────
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [activeRowToolbar, setActiveRowToolbar] = useState<number | null>(null);
  const [activeColToolbar, setActiveColToolbar] = useState<number | null>(null);

  return (
    <NodeViewWrapper
      className="canvas-table-node-wrapper"
      style={{ display: 'block', position: 'relative', marginTop: '4px', marginBottom: '4px' }}
    >
      {/* Outer positioned container — handles drag translate */}
      <div
        ref={wrapperRef}
        className={`canvas-table-root select-none group/table ${isDragging ? 'cursor-grabbing' : ''} ${isResizing ? 'cursor-ew-resize' : ''}`}
        style={{
          position: 'relative',
          transform: `translate3d(${posX}px, ${posY}px, 0)`,
          width: `${width}px`,
          border: `${theme.borderWidth}px solid ${theme.borderColor}`,
          backgroundColor: theme.cellBg,
          transition: isDragging || isResizing ? 'none' : 'box-shadow 150ms',
          boxShadow: selected ? `0 0 0 2px #FF3D00` : 'none',
          userSelect: 'none',
        }}
        contentEditable={false}
        suppressContentEditableWarning
      >
        {/* ── Top Drag Handle Bar ─────────────────────────────────────── */}
        <div
          className="canvas-table-drag-bar flex items-center justify-between px-2 h-7 cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: theme.headerBg,
            borderBottom: `${theme.borderWidth}px solid ${theme.borderColor}`,
            userSelect: 'none',
          }}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-[#FF3D00] shrink-0" strokeWidth={1.5} />
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#737373]">
              Table · {cells.length}r × {numCols}c
            </span>
            {(posX !== 0 || posY !== 0) && (
              <span className="text-[9px] font-mono text-[#FF3D00] bg-[#FF3D00]/10 px-1">
                {Math.round(posX)},{Math.round(posY)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            {/* Theme Toggle */}
            <button
              onClick={() => setIsThemeOpen((v) => !v)}
              className={`p-1 transition-colors ${isThemeOpen ? 'text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'}`}
              title="Table Theme"
            >
              <Palette className="w-3 h-3" strokeWidth={1.5} />
            </button>

            {/* Reset Position */}
            {(posX !== 0 || posY !== 0) && (
              <button
                onClick={handleResetPosition}
                className="p-1 text-[#737373] hover:text-[#FF3D00] transition-colors"
                title="Reset position"
              >
                <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
              </button>
            )}

            {/* Delete Table */}
            <button
              onClick={deleteNode}
              className="p-1 text-[#737373] hover:text-[#ef4444] transition-colors"
              title="Delete table"
            >
              <Trash2 className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Theme Panel ─────────────────────────────────────────────── */}
        {isThemeOpen && (
          <div
            className="canvas-table-theme-panel border-b px-3 py-2"
            style={{ borderColor: theme.borderColor, backgroundColor: '#0A0A0A' }}
            contentEditable={false}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono text-[#FF3D00] uppercase tracking-widest font-bold">
                Theme
              </span>
              <button
                onClick={() => setIsThemeOpen(false)}
                className="text-[#737373] hover:text-[#FAFAFA]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-0">
              <ColorPickerRow
                label="Header Bg"
                value={theme.headerBg}
                onChange={(v) => updateTheme({ headerBg: v })}
              />
              <ColorPickerRow
                label="Cell Bg"
                value={theme.cellBg}
                onChange={(v) => updateTheme({ cellBg: v })}
              />
              <ColorPickerRow
                label="Border"
                value={theme.borderColor}
                onChange={(v) => updateTheme({ borderColor: v })}
              />
              <ColorPickerRow
                label="Header Text"
                value={theme.headerTextColor}
                onChange={(v) => updateTheme({ headerTextColor: v })}
              />
              <ColorPickerRow
                label="Cell Text"
                value={theme.cellTextColor}
                onChange={(v) => updateTheme({ cellTextColor: v })}
              />
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider flex-1">Border W</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={theme.borderWidth}
                    onChange={(e) => updateTheme({ borderWidth: Number(e.target.value) })}
                    className="w-16 accent-[#FF3D00] h-1"
                  />
                  <span className="text-[9px] font-mono text-[#404040] w-4">{theme.borderWidth}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Column Header Controls (insert/delete col) ──────────────── */}
        <div
          className="canvas-table-col-controls flex"
          style={{ borderBottom: `${theme.borderWidth}px solid ${theme.borderColor}` }}
          contentEditable={false}
        >
          {/* row-label spacer */}
          <div className="w-6 shrink-0" style={{ borderRight: `${theme.borderWidth}px solid ${theme.borderColor}` }} />
          {Array.from({ length: numCols }, (_, ci) => (
            <div
              key={ci}
              className="relative flex items-center justify-center"
              style={{
                width: `${colWidth}px`,
                minWidth: `${colWidth}px`,
                height: '18px',
                backgroundColor: '#0A0A0A',
                borderRight: ci < numCols - 1 ? `${theme.borderWidth}px solid ${theme.borderColor}` : undefined,
              }}
              onMouseEnter={() => setHoveredCol(ci)}
              onMouseLeave={() => setHoveredCol(null)}
            >
              {/* Show controls on hover */}
              {hoveredCol === ci && (
                <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => insertColBefore(ci)}
                    title="Insert col before"
                    className="w-4 h-4 flex items-center justify-center text-[#737373] hover:text-[#FF3D00] hover:bg-[#FF3D00]/10 transition-colors"
                  >
                    <ChevronLeft className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => deleteCol(ci)}
                    title="Delete this col"
                    className="w-4 h-4 flex items-center justify-center text-[#737373] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => insertColAfter(ci)}
                    title="Insert col after"
                    className="w-4 h-4 flex items-center justify-center text-[#737373] hover:text-[#FF3D00] hover:bg-[#FF3D00]/10 transition-colors"
                  >
                    <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
              {hoveredCol !== ci && (
                <span className="text-[8px] font-mono text-[#3a3a3a] select-none">
                  {String.fromCharCode(65 + ci)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Cell Grid ───────────────────────────────────────────────── */}
        <div className="canvas-table-grid" style={{ backgroundColor: theme.cellBg }}>
          {cells.map((row, ri) => (
            <div
              key={ri}
              className="flex"
              style={{
                borderBottom: ri < cells.length - 1 ? `${theme.borderWidth}px solid ${theme.borderColor}` : undefined,
              }}
              onMouseEnter={() => setHoveredRow(ri)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* ── Row control gutter ──────────────────────────────── */}
              <div
                className="w-6 shrink-0 flex items-center justify-center relative"
                style={{
                  borderRight: `${theme.borderWidth}px solid ${theme.borderColor}`,
                  backgroundColor: hoveredRow === ri ? '#1A1A1A' : '#0A0A0A',
                  cursor: 'pointer',
                  minHeight: '32px',
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseEnter={() => setActiveRowToolbar(ri)}
                onMouseLeave={() => setActiveRowToolbar(null)}
              >
                {activeRowToolbar === ri ? (
                  <div className="flex flex-col gap-0 items-center">
                    <button
                      onClick={() => insertRowBefore(ri)}
                      title="Insert row above"
                      className="w-5 h-4 flex items-center justify-center text-[#737373] hover:text-[#FF3D00] hover:bg-[#FF3D00]/10 transition-colors"
                    >
                      <ChevronUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => deleteRow(ri)}
                      title="Delete this row"
                      className="w-5 h-4 flex items-center justify-center text-[#737373] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => insertRowAfter(ri)}
                      title="Insert row below"
                      className="w-5 h-4 flex items-center justify-center text-[#737373] hover:text-[#FF3D00] hover:bg-[#FF3D00]/10 transition-colors"
                    >
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[8px] font-mono text-[#3a3a3a] select-none">{ri + 1}</span>
                )}
              </div>

              {/* ── Cells in this row ────────────────────────────────── */}
              {row.map((cellValue, ci) => {
                const isHeader = ri === 0;
                return (
                  <div
                    key={ci}
                    style={{
                      width: `${colWidth}px`,
                      minWidth: `${colWidth}px`,
                      backgroundColor: isHeader ? theme.headerBg : theme.cellBg,
                      borderRight: ci < row.length - 1 ? `${theme.borderWidth}px solid ${theme.borderColor}` : undefined,
                      minHeight: '32px',
                      position: 'relative',
                    }}
                  >
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => handleCellInput(ri, ci, (e.target as HTMLDivElement).innerText)}
                      onKeyDown={(e) => {
                        // Tab key navigation between cells
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const allCells = wrapperRef.current?.querySelectorAll<HTMLDivElement>('[data-canvas-cell]');
                          if (!allCells) return;
                          const arr = Array.from(allCells);
                          const idx = arr.findIndex((el) => el === e.currentTarget);
                          const next = e.shiftKey ? arr[idx - 1] : arr[idx + 1];
                          next?.focus();
                        }
                        e.stopPropagation();
                      }}
                      data-canvas-cell=""
                      data-row={ri}
                      data-col={ci}
                      className="canvas-table-cell outline-none w-full h-full px-2 py-1.5 text-[13px] font-sans break-words"
                      style={{
                        color: isHeader ? theme.headerTextColor : theme.cellTextColor,
                        fontWeight: isHeader ? 600 : 400,
                        minHeight: '32px',
                        display: 'block',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {cellValue}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Add Row Button ─────────────────────────────────────────── */}
        <div
          className="canvas-table-add-row flex items-center justify-center h-7 cursor-pointer group/addrow hover:bg-[#1A1A1A] transition-colors"
          style={{ borderTop: `${theme.borderWidth}px solid ${theme.borderColor}` }}
          onClick={() => insertRowAfter(cells.length - 1)}
          onPointerDown={(e) => e.stopPropagation()}
          title="Add row"
          contentEditable={false}
        >
          <Plus className="w-3 h-3 text-[#3a3a3a] group-hover/addrow:text-[#FF3D00] transition-colors" strokeWidth={1.5} />
          <span className="ml-1 text-[9px] font-mono text-[#3a3a3a] group-hover/addrow:text-[#737373] uppercase tracking-wider transition-colors">
            Add Row
          </span>
        </div>

        {/* ── Bottom-right Resize Handle ─────────────────────────────── */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center cursor-ew-resize z-20 hover:bg-[#FF3D00]/20 transition-colors"
          style={{ backgroundColor: '#1A1A1A', borderTop: `${theme.borderWidth}px solid ${theme.borderColor}`, borderLeft: `${theme.borderWidth}px solid ${theme.borderColor}` }}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          title="Drag to resize table width"
          contentEditable={false}
        >
          <Maximize2 className="w-2 h-2 text-[#404040] hover:text-[#FF3D00] transition-colors" strokeWidth={2} />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
