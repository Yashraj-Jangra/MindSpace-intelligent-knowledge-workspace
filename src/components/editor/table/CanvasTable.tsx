'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { GripHorizontal, Trash2, Palette, X, RotateCcw, Plus } from 'lucide-react';
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
        return parsed.map(n => (typeof n === 'number' && n > 0 ? n : 36));
    } catch { /**/ }
  }
  return Array.from({ length: rows }, () => 36);
}

// ── Types ──────────────────────────────────────────────────────────────────

type DragKind =
  | { kind: 'table'; startX: number; startY: number; initPosX: number; initPosY: number }
  | { kind: 'corner'; startX: number; startY: number; initW: number; initColWidths: number[] }
  | { kind: 'col'; colIdx: number; startX: number; initW: number }
  | { kind: 'row'; rowIdx: number; startY: number; initH: number };

interface CtxMenu {
  x: number;
  y: number;
  row: number;
  col: number;
}

// ── Theme Preview ──────────────────────────────────────────────────────────

function ThemePreview({ theme }: { theme: CanvasTableTheme }) {
  const bdr = `${Math.max(1, theme.borderWidth)}px solid ${theme.borderColor}`;
  return (
    <div style={{ border: bdr, fontSize: 0, marginBottom: 8 }}>
      <div style={{ display: 'flex', borderBottom: bdr }}>
        {[0, 1, 2].map(ci => (
          <div key={ci} style={{ flex: 1, height: 12, backgroundColor: theme.headerBg, borderRight: ci < 2 ? bdr : undefined }} />
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        {[0, 1, 2].map(ci => (
          <div key={ci} style={{ flex: 1, height: 12, backgroundColor: theme.cellBg, borderRight: ci < 2 ? bdr : undefined }} />
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

// ── Context Menu ───────────────────────────────────────────────────────────

interface ContextMenuProps {
  menu: CtxMenu;
  onClose: () => void;
  items: Array<{ label: string; icon?: string; action: () => void; danger?: boolean } | null>;
}

function ContextMenu({ menu, onClose, items }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');

  // Position: adjust if near viewport edges
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) el.style.left = `${menu.x - rect.width - 4}px`;
    if (rect.bottom > vh) el.style.top = `${menu.y - rect.height - 4}px`;
  }, [menu.x, menu.y]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const closeKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // slight delay so the right-click event itself doesn't immediately close
    const t = setTimeout(() => {
      document.addEventListener('mousedown', close);
      document.addEventListener('keydown', closeKey);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeKey);
    };
  }, [onClose]);

  const bg = isLight ? '#FFFFFF' : '#131313';
  const border = isLight ? '#E5E5E5' : '#2A2A2A';
  const textColor = isLight ? '#1A1A1A' : '#D4D4D4';
  const hoverBg = isLight ? '#F5F5F5' : '#1E1E1E';
  const separatorColor = isLight ? '#E5E5E5' : '#262626';

  return (
    <div
      ref={ref}
      contentEditable={false}
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: menu.y + 4,
        left: menu.x + 4,
        zIndex: 99999,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        minWidth: 180,
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} style={{ height: 1, backgroundColor: separatorColor, margin: '2px 0' }} />
        ) : (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: item.danger ? '#ef4444' : textColor,
              textAlign: 'left',
              fontSize: 11,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = item.danger ? 'rgba(239,68,68,0.08)' : hoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {item.icon && <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.7 }}>{item.icon}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function CanvasTable({ node, updateAttributes, deleteNode }: NodeViewProps) {
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
  const [colWidths, setColWidths] = useState<number[]>(() => parseColWidths(attrs.colWidths, initCols, initWidth));
  const [rowHeights, setRowHeights] = useState<number[]>(() => parseRowHeights(attrs.rowHeights, initRows));
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragKind | null>(null);
  const [isTableHovered, setIsTableHovered] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const activeDragRef = useRef<DragKind | null>(null);
  const lastFlushedCellData = useRef<string | null>(attrs.cellData);

  useEffect(() => { activeDragRef.current = activeDrag; }, [activeDrag]);

  // Stable state snapshot for window handlers
  const stateRef = useRef({ cells, theme, posX, posY, width, colWidths, rowHeights });
  useEffect(() => {
    stateRef.current = { cells, theme, posX, posY, width, colWidths, rowHeights };
  });

  // ── Flush to TipTap ────────────────────────────────────────────────────
  const flushAttrs = useCallback((
    nextCells: CellData,
    nextTheme: CanvasTableTheme,
    nextPosX: number,
    nextPosY: number,
    nextWidth: number,
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
      gridHeight: null,
      colWidths: JSON.stringify(nextColWidths),
      rowHeights: JSON.stringify(nextRowHeights),
    });
  }, [updateAttributes]);

  // ── Sync from TipTap (undo/redo) ───────────────────────────────────────
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs]);

  // ── Window-level drag/resize (avoids losing pointer events on fast move) ─
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = activeDragRef.current;
      if (!drag) return;

      if (drag.kind === 'table') {
        setPosX(drag.initPosX + (e.clientX - drag.startX));
        setPosY(drag.initPosY + (e.clientY - drag.startY));
        return;
      }
      if (drag.kind === 'corner') {
        const nextW = Math.max(200, drag.initW + (e.clientX - drag.startX));
        const ratio = nextW / drag.initW;
        setColWidths(drag.initColWidths.map(cw => Math.max(40, Math.round(cw * ratio))));
        setWidth(nextW);
        return;
      }
      if (drag.kind === 'col') {
        const nextW = Math.max(40, drag.initW + (e.clientX - drag.startX));
        setColWidths(prev => { const n = [...prev]; n[drag.colIdx] = nextW; return n; });
        return;
      }
      if (drag.kind === 'row') {
        const nextH = Math.max(28, drag.initH + (e.clientY - drag.startY));
        setRowHeights(prev => { const n = [...prev]; n[drag.rowIdx] = nextH; return n; });
      }
    };

    const onUp = (e: PointerEvent) => {
      const drag = activeDragRef.current;
      if (!drag) return;
      setActiveDrag(null);
      const s = stateRef.current;

      if (drag.kind === 'table') {
        const nx = drag.initPosX + (e.clientX - drag.startX);
        const ny = drag.initPosY + (e.clientY - drag.startY);
        setPosX(nx); setPosY(ny);
        flushAttrs(s.cells, s.theme, nx, ny, s.width, s.colWidths, s.rowHeights);
        return;
      }
      if (drag.kind === 'corner') {
        const nextW = Math.max(200, drag.initW + (e.clientX - drag.startX));
        const ratio = nextW / drag.initW;
        const newCW = drag.initColWidths.map(cw => Math.max(40, Math.round(cw * ratio)));
        setColWidths(newCW); setWidth(nextW);
        flushAttrs(s.cells, s.theme, s.posX, s.posY, nextW, newCW, s.rowHeights);
        return;
      }
      if (drag.kind === 'col') {
        const nextW = Math.max(40, drag.initW + (e.clientX - drag.startX));
        const newCW = [...s.colWidths]; newCW[drag.colIdx] = nextW;
        const newTotalW = newCW.reduce((a, b) => a + b, 0);
        setColWidths(newCW); setWidth(newTotalW);
        flushAttrs(s.cells, s.theme, s.posX, s.posY, newTotalW, newCW, s.rowHeights);
        return;
      }
      if (drag.kind === 'row') {
        const nextH = Math.max(28, drag.initH + (e.clientY - drag.startY));
        const newRH = [...s.rowHeights]; newRH[drag.rowIdx] = nextH;
        setRowHeights(newRH);
        flushAttrs(s.cells, s.theme, s.posX, s.posY, s.width, s.colWidths, newRH);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [flushAttrs]);

  // ── Drag starters ──────────────────────────────────────────────────────
  const startTableDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [data-canvas-cell]')) return;
    e.preventDefault(); e.stopPropagation();
    setActiveDrag({ kind: 'table', startX: e.clientX, startY: e.clientY, initPosX: posX, initPosY: posY });
  };
  const startCornerResize = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    // Use sum of colWidths as initW (= actual cell content width, no border ambiguity)
    const contentW = colWidths.reduce((a, b) => a + b, 0);
    setActiveDrag({ kind: 'corner', startX: e.clientX, startY: e.clientY, initW: contentW, initColWidths: [...colWidths] });
  };
  const startColResize = (ci: number, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActiveDrag({ kind: 'col', colIdx: ci, startX: e.clientX, initW: colWidths[ci] ?? 80 });
  };
  const startRowResize = (ri: number, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    setActiveDrag({ kind: 'row', rowIdx: ri, startY: e.clientY, initH: rowHeights[ri] ?? 36 });
  };

  // ── Row / Col mutations ────────────────────────────────────────────────
  const insertRow = (afterIdx: number) => {
    const nc = cells[0]?.length ?? 1;
    const nc2 = [...cells.slice(0, afterIdx + 1), Array(nc).fill(''), ...cells.slice(afterIdx + 1)];
    const nh = [...rowHeights.slice(0, afterIdx + 1), 36, ...rowHeights.slice(afterIdx + 1)];
    setCells(nc2); setRowHeights(nh);
    flushAttrs(nc2, theme, posX, posY, width, colWidths, nh);
  };
  const insertRowBefore = (idx: number) => {
    const nc = cells[0]?.length ?? 1;
    const nc2 = [...cells.slice(0, idx), Array(nc).fill(''), ...cells.slice(idx)];
    const nh = [...rowHeights.slice(0, idx), 36, ...rowHeights.slice(idx)];
    setCells(nc2); setRowHeights(nh);
    flushAttrs(nc2, theme, posX, posY, width, colWidths, nh);
  };
  const deleteRow = (idx: number) => {
    if (cells.length <= 1) return;
    const nc2 = cells.filter((_, i) => i !== idx);
    const nh = rowHeights.filter((_, i) => i !== idx);
    setCells(nc2); setRowHeights(nh);
    flushAttrs(nc2, theme, posX, posY, width, colWidths, nh);
  };
  const insertCol = (afterIdx: number) => {
    const nc2 = cells.map(row => [...row.slice(0, afterIdx + 1), '', ...row.slice(afterIdx + 1)]);
    const nw = [...colWidths.slice(0, afterIdx + 1), 120, ...colWidths.slice(afterIdx + 1)];
    const total = nw.reduce((a, b) => a + b, 0);
    setCells(nc2); setColWidths(nw); setWidth(total);
    flushAttrs(nc2, theme, posX, posY, total, nw, rowHeights);
  };
  const insertColBefore = (idx: number) => {
    const nc2 = cells.map(row => [...row.slice(0, idx), '', ...row.slice(idx)]);
    const nw = [...colWidths.slice(0, idx), 120, ...colWidths.slice(idx)];
    const total = nw.reduce((a, b) => a + b, 0);
    setCells(nc2); setColWidths(nw); setWidth(total);
    flushAttrs(nc2, theme, posX, posY, total, nw, rowHeights);
  };
  const deleteCol = (idx: number) => {
    if ((cells[0]?.length ?? 0) <= 1) return;
    const nc2 = cells.map(row => row.filter((_, i) => i !== idx));
    const nw = colWidths.filter((_, i) => i !== idx);
    const total = nw.reduce((a, b) => a + b, 0);
    setCells(nc2); setColWidths(nw); setWidth(total);
    flushAttrs(nc2, theme, posX, posY, total, nw, rowHeights);
  };
  const clearCell = (ri: number, ci: number) => {
    const nc2 = cells.map((row, r) => r === ri ? row.map((v, c) => c === ci ? '' : v) : row);
    // Also clear the DOM contenteditable immediately
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-row="${ri}"][data-col="${ci}"]`);
    if (el) el.innerText = '';
    setCells(nc2);
    flushAttrs(nc2, theme, posX, posY, width, colWidths, rowHeights);
  };
  const clearRow = (ri: number) => {
    const nc2 = cells.map((row, r) => r === ri ? row.map(() => '') : row);
    // Clear DOM contenteditable cells in this row
    gridRef.current?.querySelectorAll<HTMLElement>(`[data-row="${ri}"]`).forEach(el => { el.innerText = ''; });
    setCells(nc2);
    flushAttrs(nc2, theme, posX, posY, width, colWidths, rowHeights);
  };
  const clearCol = (ci: number) => {
    const nc2 = cells.map(row => row.map((v, c) => c === ci ? '' : v));
    gridRef.current?.querySelectorAll<HTMLElement>(`[data-col="${ci}"]`).forEach(el => { el.innerText = ''; });
    setCells(nc2);
    flushAttrs(nc2, theme, posX, posY, width, colWidths, rowHeights);
  };

  // ── Cell editing ───────────────────────────────────────────────────────
  const handleCellBlur = (ri: number, ci: number, value: string) => {
    if (cells[ri]?.[ci] === value) return;
    const nc2 = cells.map((row, r) => r === ri ? row.map((v, c) => c === ci ? value : v) : row);
    setCells(nc2);
    flushAttrs(nc2, theme, posX, posY, width, colWidths, rowHeights);
  };

  // ── Context menu builder ───────────────────────────────────────────────
  const openCtxMenu = (e: React.MouseEvent, ri: number, ci: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, row: ri, col: ci });
  };

  const buildMenuItems = (ri: number, ci: number) => [
    { label: 'Insert row above', icon: '↑', action: () => insertRowBefore(ri) },
    { label: 'Insert row below', icon: '↓', action: () => insertRow(ri) },
    { label: 'Delete row', icon: '✕', action: () => deleteRow(ri), danger: true },
    null,
    { label: 'Insert column left', icon: '←', action: () => insertColBefore(ci) },
    { label: 'Insert column right', icon: '→', action: () => insertCol(ci) },
    { label: 'Delete column', icon: '✕', action: () => deleteCol(ci), danger: true },
    null,
    { label: 'Clear cell', icon: '⌫', action: () => clearCell(ri, ci) },
    { label: 'Clear row', icon: '⌫', action: () => clearRow(ri) },
    { label: 'Clear column', icon: '⌫', action: () => clearCol(ci) },
    null,
    { label: 'Delete table', icon: '🗑', action: () => deleteNode(), danger: true },
  ];

  // ── Theme ──────────────────────────────────────────────────────────────
  const updateTheme = (patch: Partial<CanvasTableTheme>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    flushAttrs(cells, next, posX, posY, width, colWidths, rowHeights);
  };

  // ── Computed ───────────────────────────────────────────────────────────
  const numCols = cells[0]?.length ?? 1;
  const bdr = `${Math.max(1, theme.borderWidth)}px solid ${theme.borderColor}`;
  const isResizingCol = activeDrag?.kind === 'col';
  const isResizingRow = activeDrag?.kind === 'row';
  const isDragging = activeDrag?.kind === 'table';
  const isResizingCorner = activeDrag?.kind === 'corner';

  return (
    <NodeViewWrapper
      className="canvas-table-node-wrapper"
      style={{ display: 'block', position: 'relative', margin: '20px 0 28px 0', userSelect: 'none' }}
    >
      {/* ── Root table container ──────────────────────────────────────── */}
      <div
        ref={rootRef}
        className="canvas-table-root"
        contentEditable={false}
        suppressContentEditableWarning
        style={{
          position: 'relative',
          display: 'inline-block',
          transform: `translate3d(${posX}px, ${posY}px, 0)`,
          // No explicit width — the root auto-sizes to its content (sum of colWidths).
          // Setting width here with box-sizing:border-box would squeeze the content area
          // by 2*borderWidth, causing the last column to overflow the border.
          border: bdr,
          cursor: isDragging ? 'grabbing' : undefined,
        }}
        onMouseEnter={() => setIsTableHovered(true)}
        onMouseLeave={() => setIsTableHovered(false)}
      >
        {/* ── Drag Bar ──────────────────────────────────────────────── */}
        <div
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GripHorizontal style={{ width: 13, height: 13, color: '#FF3D00', flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--ct-text-muted,#737373)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {cells.length} × {numCols}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onPointerDown={e => e.stopPropagation()}>
            <button
              onClick={() => setIsThemeOpen(v => !v)}
              title="Customize table style"
              style={{
                padding: 3, background: isThemeOpen ? 'rgba(255,61,0,0.12)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: isThemeOpen ? '#FF3D00' : 'var(--ct-text-muted,#737373)',
                display: 'flex', alignItems: 'center', borderRadius: 2,
              }}
            >
              <Palette style={{ width: 13, height: 13 }} strokeWidth={1.5} />
            </button>

            {(posX !== 0 || posY !== 0) && (
              <button
                onClick={() => { setPosX(0); setPosY(0); flushAttrs(cells, theme, 0, 0, width, colWidths, rowHeights); }}
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
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ct-text-muted,#737373)'; }}
            >
              <Trash2 style={{ width: 13, height: 13 }} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Theme Panel ───────────────────────────────────────────── */}
        {isThemeOpen && (
          <div
            onPointerDown={e => e.stopPropagation()}
            style={{ padding: '10px 12px', backgroundColor: 'var(--ct-bg-panel, #0A0A0A)', borderBottom: bdr }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#FF3D00', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
                Table Style
              </span>
              <button onClick={() => setIsThemeOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ct-text-muted,#737373)', display: 'flex' }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <ThemePreview theme={theme} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <ColorRow label="Cell Bg" value={theme.cellBg} onChange={v => updateTheme({ cellBg: v })} />
              <ColorRow label="Header Bg" value={theme.headerBg} onChange={v => updateTheme({ headerBg: v })} />
              <ColorRow label="Border" value={theme.borderColor} onChange={v => updateTheme({ borderColor: v })} />
              <ColorRow label="Text" value={theme.textColor} onChange={v => updateTheme({ textColor: v })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginTop: 4, borderTop: '1px solid #222' }}>
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

        {/* ── Grid ──────────────────────────────────────────────────── */}
        <div
          ref={gridRef}
          style={{ position: 'relative', backgroundColor: theme.cellBg }}
        >
          {/* Full-height column resize handles — one per column boundary */}
          {colWidths.slice(0, -1).map((_, ci) => {
            const leftPx = colWidths.slice(0, ci + 1).reduce((a, b) => a + b, 0);
            const isActive = activeDrag?.kind === 'col' && activeDrag.colIdx === ci;
            return (
              <div
                key={`cr-${ci}`}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: leftPx - 3, width: 6,
                  cursor: 'col-resize', zIndex: 25,
                  backgroundColor: isActive ? 'rgba(255,61,0,0.45)' : 'transparent',
                  transition: 'background-color 80ms',
                }}
                onPointerDown={e => startColResize(ci, e)}
                onMouseEnter={e => { if (!isResizingCol) e.currentTarget.style.backgroundColor = 'rgba(255,61,0,0.2)'; }}
                onMouseLeave={e => { if (!isResizingCol) e.currentTarget.style.backgroundColor = 'transparent'; }}
              />
            );
          })}

          {/* Rows */}
          {cells.map((row, ri) => {
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
                  height: `${rowHeights[ri] ?? 36}px`,
                  borderBottom: !isLastRow ? bdr : undefined,
                }}
              >
                {/* Cells */}
                {row.map((cellValue, ci) => {
                  const cellW = colWidths[ci] ?? Math.floor(width / numCols);
                  return (
                    <div
                      key={ci}
                      style={{
                        width: `${cellW}px`,
                        minWidth: `${cellW}px`,
                        flexShrink: 0,
                        backgroundColor: isFirstRow ? theme.headerBg : theme.cellBg,
                        borderRight: ci < row.length - 1 ? bdr : undefined,
                      }}
                    >
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        data-canvas-cell=""
                        data-row={ri}
                        data-col={ci}
                        onBlur={e => handleCellBlur(ri, ci, (e.target as HTMLDivElement).innerText)}
                        onContextMenu={e => openCtxMenu(e, ri, ci)}
                        onKeyDown={e => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const all = gridRef.current?.querySelectorAll<HTMLElement>('[data-canvas-cell]');
                            if (!all) return;
                            const arr = Array.from(all);
                            const next = arr[arr.indexOf(e.currentTarget as HTMLElement) + (e.shiftKey ? -1 : 1)];
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
                          display: 'block',
                          outline: 'none',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          height: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        {cellValue}
                      </div>
                    </div>
                  );
                })}

                {/* Row resize handle at bottom edge */}
                {!isLastRow && (
                  <div
                    style={{
                      position: 'absolute', left: 0, right: 0, bottom: -3, height: 6,
                      cursor: 'row-resize', zIndex: 24,
                      backgroundColor: isActiveRow ? 'rgba(255,61,0,0.45)' : 'transparent',
                      transition: 'background-color 80ms',
                    }}
                    onPointerDown={e => startRowResize(ri, e)}
                    onMouseEnter={e => { if (!isResizingRow) e.currentTarget.style.backgroundColor = 'rgba(255,61,0,0.2)'; }}
                    onMouseLeave={e => { if (!isResizingRow) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Corner resize handle ──────────────────────────────────── */}
        <div
          onPointerDown={startCornerResize}
          title="Drag to resize table width"
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12,
            cursor: 'nwse-resize', zIndex: 50,
            backgroundColor: isResizingCorner ? '#FF3D00' : 'var(--ct-bg-drag,#111)',
            borderTop: bdr, borderLeft: bdr,
          }}
        />

        {/* ── Floating + Row button (below table, centered) ─────────── */}
        <div
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: isTableHovered && !activeDrag ? 1 : 0,
            transition: 'opacity 150ms',
            pointerEvents: isTableHovered && !activeDrag ? 'auto' : 'none',
          }}
        >
          <button
            onClick={() => insertRow(cells.length - 1)}
            title="Add row"
            className="ct-float-btn"
          >
            <Plus style={{ width: 10, height: 10 }} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Floating + Col button (right of table, centered) ─────────── */}
        <div
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: -22,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: isTableHovered && !activeDrag ? 1 : 0,
            transition: 'opacity 150ms',
            pointerEvents: isTableHovered && !activeDrag ? 'auto' : 'none',
          }}
        >
          <button
            onClick={() => insertCol(numCols - 1)}
            title="Add column"
            className="ct-float-btn"
          >
            <Plus style={{ width: 10, height: 10 }} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Right-click context menu (fixed, outside contentEditable tree) ── */}
      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          items={buildMenuItems(ctxMenu.row, ctxMenu.col)}
        />
      )}
    </NodeViewWrapper>
  );
}
