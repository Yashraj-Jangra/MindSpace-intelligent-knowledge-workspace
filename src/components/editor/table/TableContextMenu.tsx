'use client';

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Plus,
  Minus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  LayoutGrid,
  Rows,
  Columns,
  Square,
  Sparkles,
} from 'lucide-react';

interface TableContextMenuProps {
  editor: Editor;
  position: { x: number; y: number };
  onClose: () => void;
}

type ScopeMode = 'cell' | 'row' | 'column' | 'table';

const COLOR_SWATCHES = [
  { label: 'Vermillion', hex: '#FF3D00' },
  { label: 'Emerald', hex: '#10B981' },
  { label: 'Sky', hex: '#0284C7' },
  { label: 'Amber', hex: '#F59E0B' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Dark Slate', hex: '#1E1E1E' },
  { label: 'Clear', hex: 'transparent' },
];

export function TableContextMenu({ editor, position, onClose }: TableContextMenuProps) {
  const [activeScope, setActiveScope] = useState<ScopeMode>('cell');

  if (!editor || !editor.isActive('table')) return null;

  // ── Color Cell/Row/Column Background ──────────────────────
  const handleApplyColor = (colorHex: string) => {
    if (activeScope === 'cell') {
      editor.chain().focus().setCellAttribute('backgroundColor', colorHex).run();
    } else if (activeScope === 'row') {
      // Apply color to all cells in the current row
      const table = document.querySelector('.ProseMirror table');
      const activeCell = document.activeElement?.closest('td, th');
      const row = activeCell?.parentElement;
      if (row) {
        row.querySelectorAll('td, th').forEach((cell) => {
          (cell as HTMLElement).style.backgroundColor = colorHex;
        });
      }
      editor.chain().focus().setCellAttribute('backgroundColor', colorHex).run();
    } else if (activeScope === 'column') {
      const activeCell = document.activeElement?.closest('td, th');
      if (activeCell && activeCell.parentElement) {
        const colIndex = Array.from(activeCell.parentElement.children).indexOf(activeCell);
        const table = activeCell.closest('table');
        if (table && colIndex !== -1) {
          table.querySelectorAll('tr').forEach((row) => {
            const cell = row.children[colIndex] as HTMLElement;
            if (cell) cell.style.backgroundColor = colorHex;
          });
        }
      }
      editor.chain().focus().setCellAttribute('backgroundColor', colorHex).run();
    } else {
      // Table scope
      const table = document.querySelector('.ProseMirror table');
      if (table) {
        table.querySelectorAll('td, th').forEach((cell) => {
          (cell as HTMLElement).style.backgroundColor = colorHex;
        });
      }
    }
    onClose();
  };

  // ── Apply Text Alignment ──────────────────────────────────
  const handleApplyAlignment = (alignment: 'left' | 'center' | 'right') => {
    const activeCell = document.activeElement?.closest('td, th') as HTMLElement;

    if (activeScope === 'cell') {
      if (activeCell) activeCell.style.textAlign = alignment;
    } else if (activeScope === 'row') {
      const row = activeCell?.parentElement;
      if (row) {
        row.querySelectorAll('td, th').forEach((cell) => {
          (cell as HTMLElement).style.textAlign = alignment;
        });
      }
    } else if (activeScope === 'column') {
      if (activeCell && activeCell.parentElement) {
        const colIndex = Array.from(activeCell.parentElement.children).indexOf(activeCell);
        const table = activeCell.closest('table');
        if (table && colIndex !== -1) {
          table.querySelectorAll('tr').forEach((row) => {
            const cell = row.children[colIndex] as HTMLElement;
            if (cell) cell.style.textAlign = alignment;
          });
        }
      }
    } else {
      // Table scope
      const table = document.querySelector('.ProseMirror table');
      if (table) {
        table.querySelectorAll('td, th').forEach((cell) => {
          (cell as HTMLElement).style.textAlign = alignment;
        });
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed z-[100] w-64 bg-[#0A0A0A] border border-[#FF3D00] shadow-2xl p-2.5 font-mono text-xs text-[#FAFAFA] select-none animate-in fade-in zoom-in-95"
      style={{
        left: Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - 270 : 200),
        top: Math.min(position.y, typeof window !== 'undefined' ? window.innerHeight - 420 : 200),
      }}
    >
      {/* Header */}
      <div className="text-[10px] text-[#FF3D00] uppercase tracking-wider px-2 py-1 font-bold border-b border-[#262626] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-[#FF3D00]" /> Table Controls
        </span>
        <span className="text-[#737373] text-[9px]">Right-Click</span>
      </div>

      {/* Target Scope Tabs */}
      <div className="py-2 border-b border-[#262626]">
        <div className="text-[9px] text-[#737373] uppercase tracking-wider px-2 py-0.5 font-bold mb-1">
          Apply Controls To:
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveScope('cell')}
            className={`py-1 text-[9px] uppercase tracking-wider font-bold border flex items-center justify-center gap-1 transition-colors ${
              activeScope === 'cell'
                ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Square className="w-2.5 h-2.5" /> Cell
          </button>
          <button
            onClick={() => setActiveScope('row')}
            className={`py-1 text-[9px] uppercase tracking-wider font-bold border flex items-center justify-center gap-1 transition-colors ${
              activeScope === 'row'
                ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Rows className="w-2.5 h-2.5" /> Row
          </button>
          <button
            onClick={() => setActiveScope('column')}
            className={`py-1 text-[9px] uppercase tracking-wider font-bold border flex items-center justify-center gap-1 transition-colors ${
              activeScope === 'column'
                ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Columns className="w-2.5 h-2.5" /> Col
          </button>
          <button
            onClick={() => setActiveScope('table')}
            className={`py-1 text-[9px] uppercase tracking-wider font-bold border flex items-center justify-center gap-1 transition-colors ${
              activeScope === 'table'
                ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" /> All
          </button>
        </div>
      </div>

      {/* Color Palette Swatches */}
      <div className="py-2 border-b border-[#262626]">
        <div className="text-[9px] text-[#737373] uppercase tracking-wider px-2 py-0.5 font-bold mb-1.5 flex items-center gap-1">
          <Palette className="w-3 h-3 text-[#FF3D00]" />
          <span>Background Color ({activeScope.toUpperCase()})</span>
        </div>
        <div className="flex items-center gap-1.5 px-2">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.label}
              onClick={() => handleApplyColor(swatch.hex)}
              className="w-5 h-5 border border-[#404040] hover:border-[#FF3D00] hover:scale-110 transition-transform relative group/swatch"
              style={{ backgroundColor: swatch.hex }}
              title={`Color: ${swatch.label}`}
            >
              {swatch.hex === 'transparent' && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#ef4444]">
                  /
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Text Alignment Controls */}
      <div className="py-2 border-b border-[#262626]">
        <div className="text-[9px] text-[#737373] uppercase tracking-wider px-2 py-0.5 font-bold mb-1">
          Text Alignment ({activeScope.toUpperCase()})
        </div>
        <div className="grid grid-cols-3 gap-1 px-1">
          <button
            onClick={() => handleApplyAlignment('left')}
            className="px-2 py-1 border border-[#262626] hover:border-[#FF3D00] hover:text-[#FF3D00] flex items-center justify-center gap-1 text-[10px]"
          >
            <AlignLeft className="w-3 h-3" /> Left
          </button>
          <button
            onClick={() => handleApplyAlignment('center')}
            className="px-2 py-1 border border-[#262626] hover:border-[#FF3D00] hover:text-[#FF3D00] flex items-center justify-center gap-1 text-[10px]"
          >
            <AlignCenter className="w-3 h-3" /> Center
          </button>
          <button
            onClick={() => handleApplyAlignment('right')}
            className="px-2 py-1 border border-[#262626] hover:border-[#FF3D00] hover:text-[#FF3D00] flex items-center justify-center gap-1 text-[10px]"
          >
            <AlignRight className="w-3 h-3" /> Right
          </button>
        </div>
      </div>

      {/* Column Operations */}
      <div className="py-1 border-b border-[#262626]">
        <div className="text-[9px] text-[#737373] uppercase tracking-wider px-2 py-0.5 font-bold">
          Column Controls
        </div>
        <button
          onClick={() => {
            editor.chain().focus().addColumnBefore().run();
            onClose();
          }}
          className="w-full text-left px-2 py-1 hover:bg-[#1A1A1A] hover:text-[#FF3D00] flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3 h-3 text-[#FF3D00]" /> Add Column Left
        </button>
        <button
          onClick={() => {
            editor.chain().focus().addColumnAfter().run();
            onClose();
          }}
          className="w-full text-left px-2 py-1 hover:bg-[#1A1A1A] hover:text-[#FF3D00] flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3 h-3 text-[#FF3D00]" /> Add Column Right
        </button>
        <button
          onClick={() => {
            editor.chain().focus().deleteColumn().run();
            onClose();
          }}
          className="w-full text-left px-2 py-1 hover:bg-[#1A1A1A] text-[#ef4444] flex items-center gap-1.5 transition-colors"
        >
          <Minus className="w-3 h-3" /> Delete Column
        </button>
      </div>

      {/* Row Operations */}
      <div className="py-1 border-b border-[#262626]">
        <div className="text-[9px] text-[#737373] uppercase tracking-wider px-2 py-0.5 font-bold">
          Row Controls
        </div>
        <button
          onClick={() => {
            editor.chain().focus().addRowBefore().run();
            onClose();
          }}
          className="w-full text-left px-2 py-1 hover:bg-[#1A1A1A] hover:text-[#FF3D00] flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3 h-3 text-[#FF3D00]" /> Add Row Above
        </button>
        <button
          onClick={() => {
            editor.chain().focus().addRowAfter().run();
            onClose();
          }}
          className="w-full text-left px-2 py-1 hover:bg-[#1A1A1A] hover:text-[#FF3D00] flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3 h-3 text-[#FF3D00]" /> Add Row Below
        </button>
        <button
          onClick={() => {
            editor.chain().focus().deleteRow().run();
            onClose();
          }}
          className="w-full text-left px-2 py-1 hover:bg-[#1A1A1A] text-[#ef4444] flex items-center gap-1.5 transition-colors"
        >
          <Minus className="w-3 h-3" /> Delete Row
        </button>
      </div>

      {/* Delete Table Action */}
      <div className="pt-1.5">
        <button
          onClick={() => {
            editor.chain().focus().deleteTable().run();
            onClose();
          }}
          className="w-full text-left px-2 py-1 hover:bg-[#ef4444]/20 text-[#ef4444] font-bold flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Table
        </button>
      </div>
    </div>
  );
}
