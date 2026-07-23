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
  GripHorizontal,
  Plus,
  Trash2,
  Palette,
  X,
  RotateCcw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  type CanvasTableTheme,
  type CellData,
  getDefaultTheme,
} from './CanvasTableExtension';

// ── Helpers ────────────────────────────────────────────────────────────────

function parseCellData(raw: string | null, rows: number, cols: number): CellData {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as CellData;
    } catch {/* ignore */}
  }
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

function parseTheme(raw: string | null): CanvasTableTheme {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...getDefaultTheme(), ...parsed };
      }
    } catch {/* ignore */}
  }
  return getDefaultTheme();
}

function parseColWidths(raw: string | null, cols: number, totalWidth: number): number[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === cols) return parsed as number[];
    } catch {/* ignore */}
  }
  const defaultColW = Math.max(60, Math.floor(totalWidth / cols));
  return Array.from({ length: cols }, (_, i) =>
    i === cols - 1 ? totalWidth - defaultColW * (cols - 1) : defaultColW
  );
}

function parseRowHeights(raw: string | null, rows: number): (number | null)[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === rows) return parsed;
    } catch {/* ignore */}
  }
  return Array.from({ length: rows }, () => null);
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
      <span className="text-[10px] font-mono text-[var(--ct-text-muted,#737373)] uppercase tracking-wider flex-1">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#262626'}
          onChange={(e) => onChange(e.target.value)}
          className="w-5 h-5 cursor-pointer border border-[#404040] bg-transparent p-0"
          style={{ borderRadius: 0 }}
        />
        <span className="text-[9px] font-mono text-[var(--ct-text-dim,#525252)]">{value}</span>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function CanvasTable({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
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
  const [width, setWidth] = useState<number>(attrs.width ?? 520);
  const [gridHeight, setGridHeight] = useState<number | null>(attrs.gridHeight ?? null);
  const [colWidths, setColWidths] = useState<number[]>(() =>
    parseColWidths(attrs.colWidths, cols, attrs.width ?? 520)
  );
  const [rowHeights, setRowHeights] = useState<(number | null)[]>(() =>
    parseRowHeights(attrs.rowHeights, rows)
  );

  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingCorner, setIsResizingCorner] = useState(false);
  const [resizingColIdx, setResizingColIdx] = useState<number | null>(null);
  const [resizingRowIdx, setResizingRowIdx] = useState<number | null>(null);

  // Hover states for discreet cell controls
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // ── Sync local state from TipTap attrs (undo/redo support) ─────────────
  const lastFlushedCellData = useRef<string | null>(attrs.cellData);

  useEffect(() => {
    if (attrs.cellData !== lastFlushedCellData.current) {
      lastFlushedCellData.current = attrs.cellData;
      setCells(parseCellData(attrs.cellData, attrs.rows ?? 3, attrs.cols ?? 3));
    }
    if (attrs.theme) setTheme(parseTheme(attrs.theme));
    if (attrs.posX !== undefined) setPosX(attrs.posX);
    if (attrs.posY !== undefined) setPosY(attrs.posY);
    if (attrs.width !== undefined) setWidth(attrs.width);
    if (attrs.gridHeight !== undefined) setGridHeight(attrs.gridHeight);
    if (attrs.colWidths) setColWidths(parseColWidths(attrs.colWidths, attrs.cols ?? 3, attrs.width ?? 520));
    if (attrs.rowHeights) setRowHeights(parseRowHeights(attrs.rowHeights, attrs.rows ?? 3));
  }, [attrs]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const cornerResizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const colResizeStart = useRef({ x: 0, w: 0, nextW: 0 });
  const rowResizeStart = useRef({ y: 0, h: 0 });

  // ── Sync back to TipTap attrs ──────────────────────────────────────────
  const flushAttrs = useCallback(
    (
      nextCells: CellData,
      nextTheme: CanvasTableTheme,
      nextPosX: number,
      nextPosY: number,
      nextWidth: number,
      nextGridHeight: number | null,
      nextColWidths: number[],
      nextRowHeights: (number | null)[]
    ) => {
      const dataStr = JSON.stringify(nextCells);
      lastFlushedCellData.current = dataStr;
      updateAttributes({
        rows: nextCells.length,
        cols: nextCells[0]?.length ?? 0,
        cellData: dataStr,
        theme: JSON.stringify(nextTheme),
        posX: nextPosX,
        posY: nextPosY,
        width: nextWidth,
        gridHeight: nextGridHeight,
        colWidths: JSON.stringify(nextColWidths),
        rowHeights: JSON.stringify(nextRowHeights),
      });
    },
    [updateAttributes]
  );

  // Keep colWidths aligned if total width changes or column count changes
  useEffect(() => {
    setColWidths((prev) => {
      const numC = cells[0]?.length ?? cols;
      if (prev.length === numC) return prev;
      return parseColWidths(null, numC, width);
    });
  }, [cells, cols, width]);

  // Keep rowHeights aligned if row count changes
  useEffect(() => {
    setRowHeights((prev) => {
      if (prev.length === cells.length) return prev;
      return parseRowHeights(null, cells.length);
    });
  }, [cells.length]);

  // ── Position Dragging ──────────────────────────────────────────────────
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
    flushAttrs(cells, theme, nextX, nextY, width, gridHeight, colWidths, rowHeights);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const handleResetPosition = () => {
    setPosX(0);
    setPosY(0);
    flushAttrs(cells, theme, 0, 0, width, gridHeight, colWidths, rowHeights);
  };

  // ── Corner Resizing (Width & Height) ───────────────────────────────────
  const handleCornerResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingCorner(true);
    const currentH = wrapperRef.current?.offsetHeight ?? 150;
    cornerResizeStart.current = { x: e.clientX, y: e.clientY, w: width, h: currentH };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCornerResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingCorner) return;
    const dw = e.clientX - cornerResizeStart.current.x;
    const dh = e.clientY - cornerResizeStart.current.y;

    const nextW = Math.max(200, cornerResizeStart.current.w + dw);
    const nextH = Math.max(80, cornerResizeStart.current.h + dh);

    // Scale column widths proportionally when table width changes
    const ratio = nextW / width;
    const nextCols = colWidths.map((cw) => Math.max(40, Math.round(cw * ratio)));

    setWidth(nextW);
    setGridHeight(nextH);
    setColWidths(nextCols);
  };

  const handleCornerResizePointerUp = (e: React.PointerEvent) => {
    if (!isResizingCorner) return;
    setIsResizingCorner(false);
    const dw = e.clientX - cornerResizeStart.current.x;
    const dh = e.clientY - cornerResizeStart.current.y;

    const nextW = Math.max(200, cornerResizeStart.current.w + dw);
    const nextH = Math.max(80, cornerResizeStart.current.h + dh);
    const ratio = nextW / width;
    const nextCols = colWidths.map((cw) => Math.max(40, Math.round(cw * ratio)));

    setWidth(nextW);
    setGridHeight(nextH);
    setColWidths(nextCols);
    flushAttrs(cells, theme, posX, posY, nextW, nextH, nextCols, rowHeights);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // ── Column Width Resizing ─────────────────────────────────────────────
  const handleColResizePointerDown = (cIdx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingColIdx(cIdx);
    colResizeStart.current = {
      x: e.clientX,
      w: colWidths[cIdx] || 80,
      nextW: colWidths[cIdx + 1] || 80,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleColResizePointerMove = (cIdx: number, e: React.PointerEvent) => {
    if (resizingColIdx !== cIdx) return;
    const dx = e.clientX - colResizeStart.current.x;
    const newW = Math.max(40, colResizeStart.current.w + dx);

    setColWidths((prev) => {
      const copy = [...prev];
      copy[cIdx] = newW;
      return copy;
    });
  };

  const handleColResizePointerUp = (cIdx: number, e: React.PointerEvent) => {
    if (resizingColIdx !== cIdx) return;
    setResizingColIdx(null);
    const dx = e.clientX - colResizeStart.current.x;
    const newW = Math.max(40, colResizeStart.current.w + dx);

    const nextColWidths = [...colWidths];
    nextColWidths[cIdx] = newW;
    setColWidths(nextColWidths);

    const newTotalW = nextColWidths.reduce((a, b) => a + b, 0);
    setWidth(newTotalW);

    flushAttrs(cells, theme, posX, posY, newTotalW, gridHeight, nextColWidths, rowHeights);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // ── Row Height Resizing ────────────────────────────────────────────────
  const handleRowResizePointerDown = (rIdx: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingRowIdx(rIdx);

    const rowEl = wrapperRef.current?.querySelectorAll('.canvas-table-row')[rIdx] as HTMLElement;
    const currentH = rowEl?.offsetHeight || 36;

    rowResizeStart.current = { y: e.clientY, h: currentH };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRowResizePointerMove = (rIdx: number, e: React.PointerEvent) => {
    if (resizingRowIdx !== rIdx) return;
    const dy = e.clientY - rowResizeStart.current.y;
    const newH = Math.max(28, rowResizeStart.current.h + dy);

    setRowHeights((prev) => {
      const copy = [...prev];
      copy[rIdx] = newH;
      return copy;
    });
  };

  const handleRowResizePointerUp = (rIdx: number, e: React.PointerEvent) => {
    if (resizingRowIdx !== rIdx) return;
    setResizingRowIdx(null);
    const dy = e.clientY - rowResizeStart.current.y;
    const newH = Math.max(28, rowResizeStart.current.h + dy);

    const nextRowHeights = [...rowHeights];
    nextRowHeights[rIdx] = newH;
    setRowHeights(nextRowHeights);

    flushAttrs(cells, theme, posX, posY, width, gridHeight, colWidths, nextRowHeights);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  // ── Insert/Delete Row/Col Operations ──────────────────────────────────
  const insertRowAfter = (rowIdx: number) => {
    const numCols = cells[0]?.length ?? cols;
    const newRow = Array(numCols).fill('');
    const nextCells = [...cells.slice(0, rowIdx + 1), newRow, ...cells.slice(rowIdx + 1)];
    const nextHeights = [...rowHeights.slice(0, rowIdx + 1), null, ...rowHeights.slice(rowIdx + 1)];
    setCells(nextCells);
    setRowHeights(nextHeights);
    flushAttrs(nextCells, theme, posX, posY, width, gridHeight, colWidths, nextHeights);
  };

  const insertRowBefore = (rowIdx: number) => {
    const numCols = cells[0]?.length ?? cols;
    const newRow = Array(numCols).fill('');
    const nextCells = [...cells.slice(0, rowIdx), newRow, ...cells.slice(rowIdx)];
    const nextHeights = [...rowHeights.slice(0, rowIdx), null, ...rowHeights.slice(rowIdx)];
    setCells(nextCells);
    setRowHeights(nextHeights);
    flushAttrs(nextCells, theme, posX, posY, width, gridHeight, colWidths, nextHeights);
  };

  const deleteRow = (rowIdx: number) => {
    if (cells.length <= 1) return;
    const nextCells = cells.filter((_, i) => i !== rowIdx);
    const nextHeights = rowHeights.filter((_, i) => i !== rowIdx);
    setCells(nextCells);
    setRowHeights(nextHeights);
    flushAttrs(nextCells, theme, posX, posY, width, gridHeight, colWidths, nextHeights);
  };

  const insertColAfter = (colIdx: number) => {
    const nextCells = cells.map((row) => [
      ...row.slice(0, colIdx + 1),
      '',
      ...row.slice(colIdx + 1),
    ]);
    const defaultW = Math.max(60, Math.floor(width / (colWidths.length + 1)));
    const nextColWidths = [
      ...colWidths.slice(0, colIdx + 1),
      defaultW,
      ...colWidths.slice(colIdx + 1),
    ];
    const newTotalW = nextColWidths.reduce((a, b) => a + b, 0);

    setCells(nextCells);
    setColWidths(nextColWidths);
    setWidth(newTotalW);
    flushAttrs(nextCells, theme, posX, posY, newTotalW, gridHeight, nextColWidths, rowHeights);
  };

  const insertColBefore = (colIdx: number) => {
    const nextCells = cells.map((row) => [
      ...row.slice(0, colIdx),
      '',
      ...row.slice(colIdx),
    ]);
    const defaultW = Math.max(60, Math.floor(width / (colWidths.length + 1)));
    const nextColWidths = [
      ...colWidths.slice(0, colIdx),
      defaultW,
      ...colWidths.slice(colIdx),
    ];
    const newTotalW = nextColWidths.reduce((a, b) => a + b, 0);

    setCells(nextCells);
    setColWidths(nextColWidths);
    setWidth(newTotalW);
    flushAttrs(nextCells, theme, posX, posY, newTotalW, gridHeight, nextColWidths, rowHeights);
  };

  const deleteCol = (colIdx: number) => {
    if ((cells[0]?.length ?? 0) <= 1) return;
    const nextCells = cells.map((row) => row.filter((_, i) => i !== colIdx));
    const nextColWidths = colWidths.filter((_, i) => i !== colIdx);
    const newTotalW = nextColWidths.reduce((a, b) => a + b, 0);

    setCells(nextCells);
    setColWidths(nextColWidths);
    setWidth(newTotalW);
    flushAttrs(nextCells, theme, posX, posY, newTotalW, gridHeight, nextColWidths, rowHeights);
  };

  // ── Cell Editing ───────────────────────────────────────────────────────
  const handleCellBlur = (rowIdx: number, colIdx: number, value: string) => {
    if (cells[rowIdx]?.[colIdx] === value) return;
    const nextCells = cells.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row
    );
    setCells(nextCells);
    flushAttrs(nextCells, theme, posX, posY, width, gridHeight, colWidths, rowHeights);
  };

  // ── Theme Updates ──────────────────────────────────────────────────────
  const updateTheme = (patch: Partial<CanvasTableTheme>) => {
    const nextTheme = { ...theme, ...patch };
    setTheme(nextTheme);
    flushAttrs(cells, nextTheme, posX, posY, width, gridHeight, colWidths, rowHeights);
  };

  const numCols = cells[0]?.length ?? cols;

  return (
    <NodeViewWrapper
      className="canvas-table-node-wrapper"
      style={{ display: 'block', position: 'relative', marginTop: '6px', marginBottom: '6px' }}
    >
      <div
        ref={wrapperRef}
        className={`canvas-table-root select-none group/table ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{
          position: 'relative',
          transform: `translate3d(${posX}px, ${posY}px, 0)`,
          width: `${width}px`,
          maxHeight: gridHeight ? `${gridHeight}px` : undefined,
          border: `${theme.borderWidth}px solid ${theme.borderColor}`,
          backgroundColor: theme.cellBg,
          boxShadow: selected ? '0 0 0 2px #FF3D00' : 'none',
          userSelect: 'none',
        }}
        contentEditable={false}
        suppressContentEditableWarning
      >
        {/* ── Top Sleek Drag Bar ──────────────────────────────────────── */}
        <div
          className="canvas-table-drag-bar flex items-center justify-between px-2.5 h-7 cursor-grab active:cursor-grabbing border-b"
          style={{
            backgroundColor: 'var(--ct-bg-drag, #111111)',
            borderColor: theme.borderColor,
            color: 'var(--ct-text-muted, #737373)',
          }}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-[#FF3D00] shrink-0" strokeWidth={2} />
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">
              {cells.length} × {numCols}
            </span>
          </div>

          <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            {/* Theme Customizer Toggle */}
            <button
              onClick={() => setIsThemeOpen((v) => !v)}
              className={`p-1 rounded transition-colors ${
                isThemeOpen ? 'text-[#FF3D00] bg-[#FF3D00]/10' : 'hover:text-[#FF3D00]'
              }`}
              title="Customize colors & border"
            >
              <Palette className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>

            {/* Reset Drag Position */}
            {(posX !== 0 || posY !== 0) && (
              <button
                onClick={handleResetPosition}
                className="p-1 hover:text-[#FF3D00] transition-colors"
                title="Reset table position"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}

            {/* Delete Node */}
            <button
              onClick={deleteNode}
              className="p-1 text-[#737373] hover:text-[#ef4444] transition-colors"
              title="Delete table"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Sleek Theme Panel ────────────────────────────────────────── */}
        {isThemeOpen && (
          <div
            className="canvas-table-theme-panel border-b px-3 py-2.5"
            style={{
              borderColor: theme.borderColor,
              backgroundColor: 'var(--ct-bg-panel, #0A0A0A)',
            }}
            contentEditable={false}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono text-[#FF3D00] uppercase tracking-widest font-bold">
                Table Appearance
              </span>
              <button
                onClick={() => setIsThemeOpen(false)}
                className="text-[var(--ct-text-muted,#737373)] hover:text-[#FF3D00]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <ColorPickerRow
                label="Cell Bg"
                value={theme.cellBg}
                onChange={(v) => updateTheme({ cellBg: v })}
              />
              <ColorPickerRow
                label="Header Bg"
                value={theme.headerBg}
                onChange={(v) => updateTheme({ headerBg: v })}
              />
              <ColorPickerRow
                label="Border Color"
                value={theme.borderColor}
                onChange={(v) => updateTheme({ borderColor: v })}
              />
              <ColorPickerRow
                label="Text Color"
                value={theme.textColor}
                onChange={(v) => updateTheme({ textColor: v })}
              />

              <div className="flex items-center justify-between gap-2 py-1 col-span-2">
                <span className="text-[10px] font-mono text-[var(--ct-text-muted,#737373)] uppercase tracking-wider">
                  Border Width
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={theme.borderWidth}
                    onChange={(e) => updateTheme({ borderWidth: Number(e.target.value) })}
                    className="w-24 accent-[#FF3D00] h-1"
                  />
                  <span className="text-[9px] font-mono text-[var(--ct-text-dim,#525252)] w-4 text-right">
                    {theme.borderWidth}px
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Table Grid & Cells ───────────────────────────────────────── */}
        <div
          className="canvas-table-grid relative overflow-x-auto"
          style={{ backgroundColor: theme.cellBg }}
        >
          {cells.map((row, ri) => (
            <div
              key={ri}
              className="canvas-table-row flex relative group/row"
              style={{
                height: rowHeights[ri] ? `${rowHeights[ri]}px` : undefined,
                minHeight: '32px',
                borderBottom: ri < cells.length - 1 ? `${theme.borderWidth}px solid ${theme.borderColor}` : undefined,
              }}
              onMouseEnter={() => setHoveredRow(ri)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* ── Discreet Row Control Overlays (Hover Triggered) ─────── */}
              {hoveredRow === ri && (
                <div
                  className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-30 bg-[var(--ct-bg-drag,#111111)] border border-[#333333] px-1 py-0.5 shadow-md"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => insertRowBefore(ri)}
                    title="Add row above"
                    className="text-[#737373] hover:text-[#FF3D00] p-0.5"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteRow(ri)}
                    title="Delete this row"
                    className="text-[#737373] hover:text-[#ef4444] p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => insertRowAfter(ri)}
                    title="Add row below"
                    className="text-[#737373] hover:text-[#FF3D00] p-0.5"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* ── Row Cells ────────────────────────────────────────────── */}
              {row.map((cellValue, ci) => {
                const cellWidth = colWidths[ci] || Math.floor(width / numCols);

                return (
                  <div
                    key={ci}
                    className="relative group/cell"
                    style={{
                      width: `${cellWidth}px`,
                      minWidth: `${cellWidth}px`,
                      backgroundColor: ri === 0 && theme.headerBg !== theme.cellBg ? theme.headerBg : theme.cellBg,
                      borderRight: ci < row.length - 1 ? `${theme.borderWidth}px solid ${theme.borderColor}` : undefined,
                    }}
                    onMouseEnter={() => setHoveredCol(ci)}
                    onMouseLeave={() => setHoveredCol(null)}
                  >
                    {/* ── Discreet Column Control Overlays (Top Row Hover) ── */}
                    {ri === 0 && hoveredCol === ci && (
                      <div
                        className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-30 bg-[var(--ct-bg-drag,#111111)] border border-[#333333] px-1 py-0.5 shadow-md"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => insertColBefore(ci)}
                          title="Add column left"
                          className="text-[#737373] hover:text-[#FF3D00] p-0.5"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteCol(ci)}
                          title="Delete this column"
                          className="text-[#737373] hover:text-[#ef4444] p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => insertColAfter(ci)}
                          title="Add column right"
                          className="text-[#737373] hover:text-[#FF3D00] p-0.5"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* ── Cell Contenteditable Area ───────────────────────── */}
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleCellBlur(ri, ci, (e.target as HTMLDivElement).innerText)}
                      onKeyDown={(e) => {
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
                      className="canvas-table-cell outline-none w-full h-full px-2.5 py-2 text-[13px] font-sans break-words"
                      style={{
                        color: theme.textColor,
                        fontWeight: ri === 0 && theme.headerBg !== theme.cellBg ? 600 : 400,
                        minHeight: '28px',
                        display: 'block',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {cellValue}
                    </div>

                    {/* ── Per-Column Drag Resize Edge Handle ─────────────── */}
                    {ci < row.length - 1 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:bg-[#FF3D00] transition-colors opacity-0 hover:opacity-100"
                        style={{ transform: 'translateX(50%)' }}
                        onPointerDown={(e) => handleColResizePointerDown(ci, e)}
                        onPointerMove={(e) => handleColResizePointerMove(ci, e)}
                        onPointerUp={(e) => handleColResizePointerUp(ci, e)}
                        title="Drag to resize column"
                      />
                    )}
                  </div>
                );
              })}

              {/* ── Per-Row Drag Resize Bottom Edge Handle ──────────────── */}
              {ri < cells.length - 1 && (
                <div
                  className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize z-20 hover:bg-[#FF3D00] transition-colors opacity-0 hover:opacity-100"
                  style={{ transform: 'translateY(50%)' }}
                  onPointerDown={(e) => handleRowResizePointerDown(ri, e)}
                  onPointerMove={(e) => handleRowResizePointerMove(ri, e)}
                  onPointerUp={(e) => handleRowResizePointerUp(ri, e)}
                  title="Drag to resize row height"
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Add Row Footer Button ────────────────────────────────────── */}
        <div
          className="canvas-table-add-row flex items-center justify-center h-6 cursor-pointer group/addrow transition-colors border-t"
          style={{
            borderColor: theme.borderColor,
            backgroundColor: 'var(--ct-bg-add-row, #0F0F0F)',
          }}
          onClick={() => insertRowAfter(cells.length - 1)}
          onPointerDown={(e) => e.stopPropagation()}
          title="Add new row"
          contentEditable={false}
        >
          <Plus className="w-3 h-3 text-[#737373] group-hover/addrow:text-[#FF3D00] transition-colors" strokeWidth={2} />
          <span className="ml-1 text-[9px] font-mono text-[#737373] group-hover/addrow:text-[#FF3D00] uppercase tracking-wider transition-colors">
            Row
          </span>
        </div>

        {/* ── Bottom-right Multi-directional Corner Resize Handle ───────── */}
        <div
          className="absolute bottom-0 right-0 w-3.5 h-3.5 flex items-center justify-center cursor-nwse-resize z-30 hover:bg-[#FF3D00]/30 transition-colors"
          style={{
            backgroundColor: 'var(--ct-bg-drag, #111111)',
            borderTop: `${theme.borderWidth}px solid ${theme.borderColor}`,
            borderLeft: `${theme.borderWidth}px solid ${theme.borderColor}`,
          }}
          onPointerDown={handleCornerResizePointerDown}
          onPointerMove={handleCornerResizePointerMove}
          onPointerUp={handleCornerResizePointerUp}
          title="Drag to resize table (width & height)"
          contentEditable={false}
        >
          <Maximize2 className="w-2.5 h-2.5 text-[#737373] hover:text-[#FF3D00] transition-colors" strokeWidth={2} />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
