'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Table, X } from 'lucide-react';

interface InsertTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}

const PREVIEW_ROWS = 8;
const PREVIEW_COLS = 10;

export function InsertTableModal({ isOpen, onClose, onInsert }: InsertTableModalProps) {
  // `rows` and `cols` are the confirmed selection (used for the Insert button label)
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  // `hoverRow` and `hoverCol` track the live grid hover — kept separate so
  // mouse-leave can restore to confirmed values without flickering the inputs
  const [hoverRow, setHoverRow] = useState(3);
  const [hoverCol, setHoverCol] = useState(3);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setRows(3); setCols(3);
      setHoverRow(3); setHoverCol(3);
      setTimeout(() => firstInputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Enter triggers insert with currently confirmed rows/cols
      if (e.key === 'Enter') doInsert(rows, cols);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rows, cols]);

  const doInsert = (r: number, c: number) => {
    onInsert(Math.max(1, Math.min(20, r)), Math.max(1, Math.min(20, c)));
    onClose();
  };

  if (!isOpen) return null;

  // Detect light theme to style the modal correctly
  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');

  const bg = isLight ? '#FFFFFF' : '#0F0F0F';
  const bgGrid = isLight ? '#F4F4F5' : '#111111';
  const bgInput = isLight ? '#F9FAFB' : '#1A1A1A';
  const textPrimary = isLight ? '#0A0A0A' : '#FAFAFA';
  const textMuted = isLight ? '#6B7280' : '#737373';
  const borderColor = isLight ? '#E5E7EB' : '#2A2A2A';
  const cellInactive = isLight ? '#E5E7EB' : '#2A2A2A';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          zIndex: 70,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 320,
          backgroundColor: bg,
          border: '1px solid #FF3D00',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Table style={{ width: 14, height: 14, color: '#FF3D00' }} strokeWidth={1.5} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: textPrimary }}>
              Insert Table
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: 2, display: 'flex', lineHeight: 1 }}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* ── Grid Preview ────────────────────────────────────────────── */}
        <div style={{ padding: '12px 14px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grid Selection</span>
            <span style={{ fontSize: 11, color: '#FF3D00', fontWeight: 700 }}>{hoverRow} × {hoverCol}</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${PREVIEW_COLS}, 1fr)`,
              gap: 2,
              padding: 6,
              backgroundColor: bgGrid,
              border: `1px solid ${borderColor}`,
            }}
            onMouseLeave={() => {
              // Restore grid highlight to confirmed values
              setHoverRow(rows);
              setHoverCol(cols);
            }}
          >
            {Array.from({ length: PREVIEW_ROWS }, (_, r) =>
              Array.from({ length: PREVIEW_COLS }, (_, c) => {
                const active = r < hoverRow && c < hoverCol;
                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      aspectRatio: '1',
                      backgroundColor: active ? '#FF3D00' : cellInactive,
                      opacity: active ? 1 : 0.35,
                      cursor: 'pointer',
                      transition: 'background-color 60ms, opacity 60ms',
                    }}
                    onMouseEnter={() => {
                      const nr = r + 1;
                      const nc = c + 1;
                      setHoverRow(nr);
                      setHoverCol(nc);
                      // ← Live sync to manual inputs
                      setRows(nr);
                      setCols(nc);
                    }}
                    onClick={() => doInsert(r + 1, c + 1)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── Manual Dimension Inputs ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, padding: '4px 14px 12px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 9, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
              Rows
            </label>
            <input
              ref={firstInputRef}
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={e => {
                const v = Math.max(1, Math.min(20, Number(e.target.value)));
                setRows(v);
                setHoverRow(v);
              }}
              style={{
                width: '100%',
                backgroundColor: bgInput,
                border: `1px solid ${borderColor}`,
                color: textPrimary,
                fontSize: 13,
                padding: '6px 8px',
                textAlign: 'center',
                outline: 'none',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FF3D00'; }}
              onBlur={e => { e.currentTarget.style.borderColor = borderColor; }}
            />
          </div>
          <div style={{ paddingTop: 18, color: textMuted, fontSize: 14 }}>×</div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 9, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
              Cols
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={e => {
                const v = Math.max(1, Math.min(20, Number(e.target.value)));
                setCols(v);
                setHoverCol(v);
              }}
              style={{
                width: '100%',
                backgroundColor: bgInput,
                border: `1px solid ${borderColor}`,
                color: textPrimary,
                fontSize: 13,
                padding: '6px 8px',
                textAlign: 'center',
                outline: 'none',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FF3D00'; }}
              onBlur={e => { e.currentTarget.style.borderColor = borderColor; }}
            />
          </div>
        </div>

        {/* ── Insert Button ────────────────────────────────────────────── */}
        <div style={{ padding: '0 14px 14px' }}>
          <button
            onClick={() => doInsert(rows, cols)}
            style={{
              width: '100%',
              padding: '9px 0',
              backgroundColor: '#FF3D00',
              border: '1px solid #FF3D00',
              color: '#0A0A0A',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'background-color 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FF5722'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FF3D00'; }}
            onMouseDown={e => { e.currentTarget.style.backgroundColor = '#D4370A'; }}
            onMouseUp={e => { e.currentTarget.style.backgroundColor = '#FF5722'; }}
          >
            Insert {rows} × {cols} Table
          </button>
        </div>
      </div>
    </>
  );
}
