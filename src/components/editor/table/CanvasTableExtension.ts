import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CanvasTable } from './CanvasTable';

// ── Theme types ────────────────────────────────────────────────────────────

export interface CanvasTableTheme {
  cellBg: string;
  headerBg: string;    // first row background (opt-in — defaults to same as cellBg)
  borderColor: string;
  borderWidth: number; // px, 0–4
  textColor: string;
}

export const DARK_TABLE_THEME: CanvasTableTheme = {
  cellBg: '#0F0F0F',
  headerBg: '#171717',
  borderColor: '#2E2E2E',
  borderWidth: 1,
  textColor: '#E0E0E0',
};

export const LIGHT_TABLE_THEME: CanvasTableTheme = {
  cellBg: '#FFFFFF',
  headerBg: '#F5F5F5',
  borderColor: '#DCDCDC',
  borderWidth: 1,
  textColor: '#1A1A1A',
};

export function getDefaultTheme(): CanvasTableTheme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
    return { ...LIGHT_TABLE_THEME };
  }
  return { ...DARK_TABLE_THEME };
}

export type CellData = string[][];

// ── Command type augmentation ──────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    canvasTable: {
      insertCanvasTable: (rows: number, cols: number) => ReturnType;
    };
  }
}

// ── Extension ─────────────────────────────────────────────────────────────

export const CanvasTableExtension = Node.create({
  name: 'canvasTable',
  group: 'block',
  atom: true,      // ProseMirror treats the whole node as opaque
  draggable: false, // we handle dragging ourselves

  addAttributes() {
    return {
      rows: { default: 3 },
      cols: { default: 3 },

      // JSON string[][]
      cellData: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-cell-data') ?? null,
        renderHTML: (attrs) => ({ 'data-cell-data': attrs.cellData ?? '' }),
      },

      // JSON CanvasTableTheme
      theme: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-theme') ?? null,
        renderHTML: (attrs) => ({ 'data-theme': attrs.theme ?? '' }),
      },

      // Freeform canvas offset (px)
      posX: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-pos-x') ?? 0),
        renderHTML: (attrs) => ({ 'data-pos-x': String(attrs.posX ?? 0) }),
      },
      posY: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-pos-y') ?? 0),
        renderHTML: (attrs) => ({ 'data-pos-y': String(attrs.posY ?? 0) }),
      },

      // Container width (px) — dragged via corner handle
      width: {
        default: 520,
        parseHTML: (el) => Number(el.getAttribute('data-width') ?? 520),
        renderHTML: (attrs) => ({ 'data-width': String(attrs.width ?? 520) }),
      },

      // Grid max-height (px, null = auto)
      gridHeight: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute('data-grid-height');
          return v ? Number(v) : null;
        },
        renderHTML: (attrs) =>
          attrs.gridHeight != null ? { 'data-grid-height': String(attrs.gridHeight) } : {},
      },

      // JSON number[] — per-column widths (px)
      colWidths: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-col-widths') ?? null,
        renderHTML: (attrs) =>
          attrs.colWidths ? { 'data-col-widths': attrs.colWidths } : {},
      },

      // JSON number[] — per-row heights (px)
      rowHeights: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-row-heights') ?? null,
        renderHTML: (attrs) =>
          attrs.rowHeights ? { 'data-row-heights': attrs.rowHeights } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-canvas-table]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-canvas-table': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CanvasTable);
  },

  addCommands() {
    return {
      insertCanvasTable:
        (rows: number, cols: number) =>
        ({ commands }) => {
          // All cells start empty — no "Header 1/2/3" pre-fill
          const cellData: CellData = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => '')
          );

          const defaultW = 520;
          const colW = Math.floor(defaultW / cols);
          const colWidths = Array.from({ length: cols }, (_, i) =>
            i === cols - 1 ? defaultW - colW * (cols - 1) : colW
          );

          return commands.insertContent({
            type: this.name,
            attrs: {
              rows,
              cols,
              cellData: JSON.stringify(cellData),
              theme: JSON.stringify(getDefaultTheme()),
              posX: 0,
              posY: 0,
              width: defaultW,
              gridHeight: null,
              colWidths: JSON.stringify(colWidths),
              rowHeights: null,
            },
          });
        },
    };
  },
});
