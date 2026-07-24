'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { GripHorizontal, Plus, Trash2, Palette, X, RotateCcw } from 'lucide-react';
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
    } catch { /**/ }
  }
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

function parseTheme(raw: string | null): CanvasTableTheme {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return { ...getDefaultTheme(), ...parsed };
    } catch { /**/ }
  }
  return getDefaultTheme();
}

function parseColWidths(raw: string | null, cols: number, totalWidth: number): number[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === cols && parsed.every(n => typeof n === 'number' && n > 0))
        return parsed as number[];
    } catch { /**/ }
  }
  const base = Math.max(60, Math.floor(totalWidth / cols));
  return Array.from({ length: cols }, (_, i) =>
    i === cols - 1 ? Math.max(60, totalWidth - base * (cols - 1)) : base
  );
}

function parseRowHeights(raw: string | null, rows: number): number[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === rows)
        // Coerce nulls (old format used null = "auto") or zeros to default height 36
        return parsed.map(n => (typeof n === 'number' && n > 0 ? n : 36));
    } catch { /**/ }
  }
  return Array.from({ length: rows }, () => 36);
}

// ── Active drag type ───────────────────────────────────────────────────────

type DragKind =
  | { kind: 'table'; startX: number; startY: number; initPosX: number; initPosY: number }
  // initColWidths is captured at drag-start so we ALWAYS scale from the frozen snapshot,
  // never from stateRef.colWidths which changes mid-drag and causes compounding drift.
  | { kind: 'corner'; startX: number; startY: number; initW: number; initColWidths: number[] }
  | { kind: 'col'; colIdx: number; startX: number; initW: number }
  | { kind: 'row'; rowIdx: number; startY: number; initH: number };

// ── Theme Preview Strip ────────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: CanvasTableTheme }) {
  const bdr = `${theme.borderWidth}px solid ${theme.borderColor}`;
  return (
    <div style={{ border: bdr, fontSize: 0, marginBottom: 8 }}>
      {/* Header row preview */}
      <div style={{ display: 'flex', borderBottom: bdr }}>
        {[0, 1, 2].map(ci => (
          <div
            key={ci}
            style={{
              flex: 1,
              height: 14,
              backgroundColor: theme.headerBg,
              borderRight: ci < 2 ? bdr : undefined,
            }}
          />
        ))}
      </div>
      {/* Body row preview */}
      <div style={{ display: 'flex' }}>
        {[0, 1, 2].map(ci => (
          <div
            key={ci}
            style={{
              flex: 1,
              height: 14,
              backgroundColor: theme.cellBg,
              borderRight: ci < 2 ? bdr : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Color Row ──────────────────────────────────────────────────────────────

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--ct-text-muted,#737373)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 16, height: 16, background: value, border: '1px solid #404040', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <input
            type="color"
            value={value.startsWith('#') ? value : '#262626'}
            onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', inset: '-4px', width: '200%', height: '200%', cursor: 'pointer', border: 'none', padding: 0 }}
          />
        </div>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--ct-text-dim,#525252)', minWidth: 52 }}>{value}</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function CanvasTable({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs;
  const initRows: number = attrs.rows ?? 3;
  const initCols: number = attrs.cols ?? 3;
  const initWidth: number = attrs.width ?? 520;

  // ── State ──────────────────────────────────────────────────────────────
  const [cells, setCells] = useState<CellData>(() => parseCellData(attrs.cellData, initRows, initCols));
  const [theme, setTheme] = useState<CanvasTableTheme>(() => parseTheme(attrs.theme));
  const [posX, setPosX] = useState<number>(attrs.posX ?? 0);
  const [posY, setPosY] = useState<number>(attrs.posY ?? 0);
  const [width, setWidth] = useState<number>(initWidth);
  const [tableHeight, setTableHeight] = useState<number | null>(attrs.gridHeight ?? null);
  const [colWidths, setColWidths] = useState<number[]>(() => parseColWidths(attrs.colWidths, initCols, initWidth));
  const [rowHeights, setRowHeights] = useState<number[]>(() => parseRowHeights(attrs.rowHeights, initRows));
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragKind | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const activeDragRef = useRef<DragKind | null>(null);
  const lastFlushedCellData = useRef<string | null>(attrs.cellData);

  // Keep activeDragRef in sync (needed by window event handlers)
  useEffect(() => { activeDragRef.current = activeDrag; }, [activeDrag]);

  // Stable state ref so window handlers can read current values
  const stateRef = useRef({ cells, theme, posX, posY, width, tableHeight, colWidths, rowHeights });
  useEffect(() => {
    stateRef.current = { cells, theme, posX, posY, width, tableHeight, colWidths, rowHeights };
  });

  // ── Flush to TipTap ────────────────────────────────────────────────────
  const flushAttrs = useCallback((
    nextCells: CellData,
    nextTheme: CanvasTableTheme,
    nextPosX: number,
    nextPosY: number,
    nextWidth: number,
    nextTableHeight: number | null,
    nextColWidths: number[],
    nextRowHeights: number[],
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
      gridHeight: nextTableHeight,
      colWidths: JSON.stringify(nextColWidths),
      rowHeights: JSON.stringify(nextRowHeights),
    });
  }, [updateAttributes]);

  // ── Undo/redo sync from attrs ──────────────────────────────────────────
  useEffect(() => {
    if (attrs.cellData !== lastFlushedCellData.current) {
      lastFlushedCellData.current = attrs.cellData;
      const newCells = parseCellData(attrs.cellData, attrs.rows ?? 3, attrs.cols ?? 3);
      setCells(newCells);
      setColWidths(parseColWidths(attrs.colWidths, attrs.cols ?? 3, attrs.width ?? 520));
      setRowHeights(parseRowHeights(attrs.rowHeights, attrs.rows ?? 3));
    }
    if (attrs.theme) setTheme(parseTheme(attrs.theme));
    if (attrs.posX !== undefined) setPosX(attrs.posX);
    if (attrs.posY !== undefined) setPosY(attrs.posY);
    if (attrs.width !== undefined) setWidth(attrs.width);
    setTableHeight(attrs.gridHeight ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs]);

  // ── Window-level drag/resize handlers (avoids lost pointer events) ─────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = activeDragRef.current;
      if (!drag) return;

      if (drag.kind === 'table') {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        setPosX(drag.initPosX + dx);
        setPosY(drag.initPosY + dy);
        return;
      }

      if (drag.kind === 'corner') {
        const dw = e.clientX - drag.startX;
        const nextW = Math.max(200, drag.initW + dw);
        // Always scale from frozen initColWidths — never from live stateRef (which changes mid-drag)
        const ratio = nextW / drag.initW;
        setColWidths(drag.initColWidths.map(cw => Math.max(40, Math.round(cw * ratio))));
        setWidth(nextW);
        return;
      }

      if (drag.kind === 'col') {
        const dx = e.clientX - drag.startX;
        const nextW = Math.max(40, drag.initW + dx);
        setColWidths(prev => {
          const next = [...prev];
          next[drag.colIdx] = nextW;
          return next;
        });
        return;
      }

      if (drag.kind === 'row') {
        const dy = e.clientY - drag.startY;
        const nextH = Math.max(28, drag.initH + dy);
        setRowHeights(prev => {
          const next = [...prev];
          next[drag.rowIdx] = nextH;
          return next;
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      const drag = activeDragRef.current;
      if (!drag) return;
      setActiveDrag(null);
      const s = stateRef.current;

      if (drag.kind === 'table') {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const nx = drag.initPosX + dx;
        const ny = drag.initPosY + dy;
        setPosX(nx);
        setPosY(ny);
        flushAttrs(s.cells, s.theme, nx, ny, s.width, s.tableHeight, s.colWidths, s.rowHeights);
        return;
      }

      if (drag.kind === 'corner') {
        const dw = e.clientX - drag.startX;
        const nextW = Math.max(200, drag.initW + dw);
        const ratio = nextW / drag.initW;
        const newColWidths = drag.initColWidths.map(cw => Math.max(40, Math.round(cw * ratio)));
        setColWidths(newColWidths);
        setWidth(nextW);
        flushAttrs(s.cells, s.theme, s.posX, s.posY, nextW, null, newColWidths, s.rowHeights);
        return;
      }

      if (drag.kind === 'col') {
        const dx = e.clientX - drag.startX;
        const nextW = Math.max(40, drag.initW + dx);
        const newColWidths = [...s.colWidths];
        newColWidths[drag.colIdx] = nextW;
        const newTotalW = newColWidths.reduce((a, b) => a + b, 0);
        setColWidths(newColWidths);
        setWidth(newTotalW);
        flushAttrs(s.cells, s.theme, s.posX, s.posY, newTotalW, s.tableHeight, newColWidths, s.rowHeights);
        return;
      }

      if (drag.kind === 'row') {
        const dy = e.clientY - drag.startY;
        const nextH = Math.max(28, drag.initH + dy);
        const newRowHeights = [...s.rowHeights];
        newRowHeights[drag.rowIdx] = nextH;
        setRowHeights(newRowHeights);
        flushAttrs(s.cells, s.theme, s.posX, s.posY, s.width, s.tableHeight, s.colWidths, newRowHeights);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [flushAttrs]);

  // ── Drag start helpers ─────────────────────────────────────────────────
  const startTableDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [data-canvas-cell]')) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag({ kind: 'table', startX: e.clientX, startY: e.clientY, initPosX: posX, initPosY: posY });
  };

  const startCornerResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture frozen col widths at drag start — used throughout the drag to avoid scaling drift
    setActiveDrag({ kind: 'corner', startX: e.clientX, startY: e.clientY, initW: width, initColWidths: [...colWidths] });
  };

  const startColResize = (colIdx: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag({ kind: 'col', colIdx, startX: e.clientX, initW: colWidths[colIdx] ?? 80 });
  };

  const startRowResize = (rowIdx: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag({ kind: 'row', rowIdx, startY: e.clientY, initH: rowHeights[rowIdx] ?? 36 });
  };

  // ── Row / Col operations ───────────────────────────────────────────────
  const insertRow = (afterIdx: number) => {
    const nc = cells[0]?.length ?? 1;
    const nextCells = [...cells.slice(0, afterIdx + 1), Array(nc).fill(''), ...cells.slice(afterIdx + 1)];
    const nextRH = [...rowHeights.slice(0, afterIdx + 1), 36, ...rowHeights.slice(afterIdx + 1)];
    setCells(nextCells);
    setRowHeights(nextRH);
    flushAttrs(nextCells, theme, posX, posY, width, tableHeight, colWidths, nextRH);
  };

  const insertRowBefore = (idx: number) => {
    const nc = cells[0]?.length ?? 1;
    const nextCells = [...cells.slice(0, idx), Array(nc).fill(''), ...cells.slice(idx)];
    const nextRH = [...rowHeights.slice(0, idx), 36, ...rowHeights.slice(idx)];
    setCells(nextCells);
    setRowHeights(nextRH);
    flushAttrs(nextCells, theme, posX, posY, width, tableHeight, colWidths, nextRH);
  };

  const deleteRow = (idx: number) => {
    if (cells.length <= 1) return;
    const nextCells = cells.filter((_, i) => i !== idx);
    const nextRH = rowHeights.filter((_, i) => i !== idx);
    setCells(nextCells);
    setRowHeights(nextRH);
    flushAttrs(nextCells, theme, posX, posY, width, tableHeight, colWidths, nextRH);
  };

  const insertCol = (afterIdx: number) => {
    const defaultW = Math.max(60, Math.floor(120));
    const nextCells = cells.map(row => [...row.slice(0, afterIdx + 1), '', ...row.slice(afterIdx + 1)]);
    const nextCW = [...colWidths.slice(0, afterIdx + 1), defaultW, ...colWidths.slice(afterIdx + 1)];
    const newTotalW = nextCW.reduce((a, b) => a + b, 0);
    setCells(nextCells);
    setColWidths(nextCW);
    setWidth(newTotalW);
    flushAttrs(nextCells, theme, posX, posY, newTotalW, tableHeight, nextCW, rowHeights);
  };

  const insertColBefore = (idx: number) => {
    const defaultW = Math.max(60, 120);
    const nextCells = cells.map(row => [...row.slice(0, idx), '', ...row.slice(idx)]);
    const nextCW = [...colWidths.slice(0, idx), defaultW, ...colWidths.slice(idx)];
    const newTotalW = nextCW.reduce((a, b) => a + b, 0);
    setCells(nextCells);
    setColWidths(nextCW);
    setWidth(newTotalW);
    flushAttrs(nextCells, theme, posX, posY, newTotalW, tableHeight, nextCW, rowHeights);
  };

  const deleteCol = (idx: number) => {
    if ((cells[0]?.length ?? 0) <= 1) return;
    const nextCells = cells.map(row => row.filter((_, i) => i !== idx));
    const nextCW = colWidths.filter((_, i) => i !== idx);
    const newTotalW = nextCW.reduce((a, b) => a + b, 0);
    setCells(nextCells);
    setColWidths(nextCW);
    setWidth(newTotalW);
    flushAttrs(nextCells, theme, posX, posY, newTotalW, tableHeight, nextCW, rowHeights);
  };

  // ── Cell editing ───────────────────────────────────────────────────────
  const handleCellBlur = (ri: number, ci: number, value: string) => {
    if (cells[ri]?.[ci] === value) return;
    const nextCells = cells.map((row, r) =>
      r === ri ? row.map((cell, c) => (c === ci ? value : cell)) : row
    );
    setCells(nextCells);
    flushAttrs(nextCells, theme, posX, posY, width, tableHeight, colWidths, rowHeights);
  };

  // ── Theme ──────────────────────────────────────────────────────────────
  const updateTheme = (patch: Partial<CanvasTableTheme>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    flushAttrs(cells, next, posX, posY, width, tableHeight, colWidths, rowHeights);
  };

  // ── Computed ───────────────────────────────────────────────────────────
  const numCols = cells[0]?.length ?? 1;
  const isResizingCol = activeDrag?.kind === 'col';
  const isResizingRow = activeDrag?.kind === 'row';
  const isDragging = activeDrag?.kind === 'table';
  const isResizingCorner = activeDrag?.kind === 'corner';
  const bdr = `${Math.max(1, theme.borderWidth)}px solid ${theme.borderColor}`;

  // Total pixel width of all columns
  const totalColWidth = colWidths.reduce((a, b) => a + b, 0);

  return (
    <NodeViewWrapper
      className="canvas-table-node-wrapper"
      style={{ display: 'block', position: 'relative', margin: '6px 0', userSelect: 'none' }}
    >
      {/* ── Root container ─────────────────────────────────────────────── */}
      <div
        ref={rootRef}
        className="canvas-table-root"
        contentEditable={false}
        suppressContentEditableWarning
        style={{
          position: 'relative',
          transform: `translate3d(${posX}px, ${posY}px, 0)`,
          width: `${width}px`,
          border: bdr,
          boxShadow: selected ? '0 0 0 2px #FF3D00' : undefined,
          cursor: isDragging ? 'grabbing' : undefined,
        }}
      >
        {/* ── Drag Bar ─────────────────────────────────────────────────── */}
        <div
          className="canvas-table-drag-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 28,
            paddingInline: 10,
            backgroundColor: 'var(--ct-bg-drag, #111)',
            borderBottom: bdr,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
          onPointerDown={startTableDrag}
        >
          {/* Left: grip + dimension label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GripHorizontal style={{ width: 13, height: 13, color: '#FF3D00', flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--ct-text-muted,#737373)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {cells.length} × {numCols}
            </span>
          </div>

          {/* Right: action buttons (stop drag propagation) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onPointerDown={e => e.stopPropagation()}>
            <button
              onClick={() => setIsThemeOpen(v => !v)}
              title="Customize table style"
              style={{
                padding: 3,
                background: isThemeOpen ? 'rgba(255,61,0,0.12)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isThemeOpen ? '#FF3D00' : 'var(--ct-text-muted,#737373)',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 2,
              }}
            >
              <Palette style={{ width: 13, height: 13 }} strokeWidth={1.5} />
            </button>

            {(posX !== 0 || posY !== 0) && (
              <button
                onClick={() => {
                  setPosX(0); setPosY(0);
                  flushAttrs(cells, theme, 0, 0, width, tableHeight, colWidths, rowHeights);
                }}
                title="Reset position"
                style={{ padding: 3, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ct-text-muted,#737373)', display: 'flex', alignItems: 'center', borderRadius: 2 }}
              >
                <RotateCcw style={{ width: 13, height: 13 }} strokeWidth={1.5} />
              </button>
            )}

            <button
              onClick={deleteNode}
              title="Delete table"
              style={{ padding: 3, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ct-text-muted,#737373)', display: 'flex', alignItems: 'center', borderRadius: 2 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ct-text-muted,#737373)')}
            >
              <Trash2 style={{ width: 13, height: 13 }} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Theme Panel ───────────────────────────────────────────────── */}
        {isThemeOpen && (
          <div
            onPointerDown={e => e.stopPropagation()}
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--ct-bg-panel, #0A0A0A)',
              borderBottom: bdr,
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#FF3D00', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
                Table Style
              </span>
              <button
                onClick={() => setIsThemeOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ct-text-muted,#737373)', display: 'flex' }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>

            {/* Live preview */}
            <ThemePreview theme={theme} />

            {/* Color pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <ColorRow label="Cell Bg" value={theme.cellBg} onChange={v => updateTheme({ cellBg: v })} />
              <ColorRow label="Header Bg" value={theme.headerBg} onChange={v => updateTheme({ headerBg: v })} />
              <ColorRow label="Border" value={theme.borderColor} onChange={v => updateTheme({ borderColor: v })} />
              <ColorRow label="Text" value={theme.textColor} onChange={v => updateTheme({ textColor: v })} />
            </div>

            {/* Border width */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginTop: 2, borderTop: '1px solid #222' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--ct-text-muted,#737373)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Border Width
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range" min={0} max={4} step={1}
                  value={theme.borderWidth}
                  onChange={e => updateTheme({ borderWidth: Number(e.target.value) })}
                  className="canvas-table-range"
                  style={{ width: 80 }}
                />
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--ct-text-dim,#525252)', width: 20, textAlign: 'right' }}>
                  {theme.borderWidth}px
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Grid ──────────────────────────────────────────────────────── */}
        <div
          ref={gridRef}
          style={{
            position: 'relative',
            overflow: 'visible', // No scroll — table grows naturally with content
            backgroundColor: theme.cellBg,
          }}
        >
          {/* ── Column resize handles (full-height, one per boundary) ── */}
          {colWidths.slice(0, -1).map((_, ci) => {
            const leftOffset = colWidths.slice(0, ci + 1).reduce((a, b) => a + b, 0);
            const isActiveCol = activeDrag?.kind === 'col' && activeDrag.colIdx === ci;
            return (
              <div
                key={`col-resize-${ci}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: leftOffset - 3,
                  width: 6,
                  cursor: 'col-resize',
                  zIndex: 25,
                  backgroundColor: isActiveCol ? 'rgba(255,61,0,0.5)' : 'transparent',
                  transition: 'background-color 100ms',
                }}
                onPointerDown={e => startColResize(ci, e)}
                onMouseEnter={e => { if (!isResizingCol) e.currentTarget.style.backgroundColor = 'rgba(255,61,0,0.25)'; }}
                onMouseLeave={e => { if (!isResizingCol) e.currentTarget.style.backgroundColor = 'transparent'; }}
                title="Drag to resize column"
              />
            );
          })}

          {/* ── Rows ─────────────────────────────────────────────────── */}
          {cells.map((row, ri) => {
            const rowH = rowHeights[ri] ?? 36;
            const isFirstRow = ri === 0;
            const isLastRow = ri === cells.length - 1;
            const isActiveRow = activeDrag?.kind === 'row' && activeDrag.rowIdx === ri;

            return (
              <div
                key={ri}
                className="canvas-table-row"
                style={{
                  display: 'flex',
                  position: 'relative',
                  height: `${rowH}px`,
                  borderBottom: !isLastRow ? bdr : undefined,
                }}
                onMouseEnter={() => setHoveredRow(ri)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Row hover controls — appear on left edge of row */}
                {hoveredRow === ri && activeDrag === null && (
                  <div
                    onPointerDown={e => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      left: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      zIndex: 40,
                      opacity: 0.85,
                    }}
                  >
                    {ri > 0 && (
                      <button onClick={() => insertRowBefore(ri)} title="Insert row above" className="ct-row-btn">
                        ↑
                      </button>
                    )}
                    <button onClick={() => insertRow(ri)} title="Insert row below" className="ct-row-btn">
                      +
                    </button>
                    <button onClick={() => deleteRow(ri)} title="Delete row" className="ct-row-btn ct-row-btn-del">
                      ×
                    </button>
                  </div>
                )}

                {/* Cells */}
                {row.map((cellValue, ci) => {
                  const cellW = colWidths[ci] ?? Math.floor(width / numCols);
                  const bgColor = isFirstRow ? theme.headerBg : theme.cellBg;
                  const isLastCol = ci === row.length - 1;

                  return (
                    <div
                      key={ci}
                      style={{
                        width: `${cellW}px`,
                        minWidth: `${cellW}px`,
                        flexShrink: 0,
                        position: 'relative',
                        backgroundColor: bgColor,
                        borderRight: !isLastCol ? bdr : undefined,
                      }}
                      onMouseEnter={() => setHoveredCol(ci)}
                      onMouseLeave={() => setHoveredCol(null)}
                    >
                      {/* Col hover controls — only on first row */}
                      {ri === 0 && hoveredCol === ci && activeDrag === null && (
                        <div
                          onPointerDown={e => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: 3,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            zIndex: 40,
                            opacity: 0.85,
                          }}
                        >
                          {ci > 0 && (
                            <button onClick={() => insertColBefore(ci)} title="Insert col left" className="ct-col-btn">
                              ←
                            </button>
                          )}
                          <button onClick={() => insertCol(ci)} title="Insert col right" className="ct-col-btn">
                            +
                          </button>
                          <button onClick={() => deleteCol(ci)} title="Delete col" className="ct-col-btn ct-col-btn-del">
                            ×
                          </button>
                        </div>
                      )}

                      {/* Contenteditable cell */}
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        data-canvas-cell=""
                        data-row={ri}
                        data-col={ci}
                        onBlur={e => handleCellBlur(ri, ci, (e.target as HTMLDivElement).innerText)}
                        onKeyDown={e => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const all = gridRef.current?.querySelectorAll<HTMLElement>('[data-canvas-cell]');
                            if (!all) return;
                            const arr = Array.from(all);
                            const idx = arr.indexOf(e.currentTarget as HTMLElement);
                            const next = e.shiftKey ? arr[idx - 1] : arr[idx + 1];
                            next?.focus();
                          }
                          e.stopPropagation();
                        }}
                        className="canvas-table-cell"
                        style={{
                          color: theme.textColor,
                          fontWeight: isFirstRow ? 600 : 400,
                          padding: '6px 10px',
                          fontSize: 13,
                          minHeight: '100%',
                          display: 'block',
                          outline: 'none',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                        }}
                      >
                        {cellValue}
                      </div>
                    </div>
                  );
                })}

                {/* Row resize handle — at bottom edge, full width */}
                {!isLastRow && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -3,
                      height: 6,
                      cursor: 'row-resize',
                      zIndex: 24,
                      backgroundColor: isActiveRow ? 'rgba(255,61,0,0.5)' : 'transparent',
                      transition: 'background-color 100ms',
                    }}
                    onPointerDown={e => startRowResize(ri, e)}
                    onMouseEnter={e => { if (!isResizingRow) e.currentTarget.style.backgroundColor = 'rgba(255,61,0,0.25)'; }}
                    onMouseLeave={e => { if (!isResizingRow) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    title="Drag to resize row"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer: Add Row + Add Col ─────────────────────────────────── */}
        <div
          onPointerDown={e => e.stopPropagation()}
          style={{
            display: 'flex',
            borderTop: bdr,
            backgroundColor: 'var(--ct-bg-add-row, #0F0F0F)',
          }}
          contentEditable={false}
        >
          <button
            onClick={() => insertRow(cells.length - 1)}
            title="Add row"
            className="ct-footer-btn"
            style={{ flex: 1, borderRight: bdr }}
          >
            <Plus style={{ width: 11, height: 11 }} strokeWidth={2} />
            <span>Row</span>
          </button>
          <button
            onClick={() => insertCol(numCols - 1)}
            title="Add column"
            className="ct-footer-btn"
            style={{ flex: 1 }}
          >
            <Plus style={{ width: 11, height: 11 }} strokeWidth={2} />
            <span>Col</span>
          </button>
        </div>

        {/* ── Corner resize handle ──────────────────────────────────────── */}
        <div
          onPointerDown={startCornerResize}
          title="Drag to resize table"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 14,
            height: 14,
            cursor: 'nwse-resize',
            zIndex: 50,
            backgroundColor: isResizingCorner ? '#FF3D00' : 'var(--ct-bg-drag,#111)',
            borderTop: bdr,
            borderLeft: bdr,
          }}
        />
      </div>
    </NodeViewWrapper>
  );
}
