import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CanvasTable } from './CanvasTable';

export interface CanvasTableTheme {
  headerBg: string;
  cellBg: string;
  borderColor: string;
  borderWidth: number;
  headerTextColor: string;
  cellTextColor: string;
}

export const DEFAULT_CANVAS_TABLE_THEME: CanvasTableTheme = {
  headerBg: '#1A1A1A',
  cellBg: '#0F0F0F',
  borderColor: '#262626',
  borderWidth: 1,
  headerTextColor: '#FAFAFA',
  cellTextColor: '#FAFAFA',
};

export type CellData = string[][];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    canvasTable: {
      insertCanvasTable: (rows: number, cols: number) => ReturnType;
    };
  }
}

export const CanvasTableExtension = Node.create({
  name: 'canvasTable',
  group: 'block',
  atom: true, // treat as an opaque block — ProseMirror won't try to enter it
  draggable: false, // we handle dragging ourselves

  addAttributes() {
    return {
      rows: { default: 3 },
      cols: { default: 3 },
      // JSON-stringified CellData (string[][])
      cellData: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-cell-data') ?? null,
        renderHTML: (attrs) => ({ 'data-cell-data': attrs.cellData ?? '' }),
      },
      // JSON-stringified CanvasTableTheme
      theme: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-theme') ?? null,
        renderHTML: (attrs) => ({ 'data-theme': attrs.theme ?? '' }),
      },
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
      width: {
        default: 560,
        parseHTML: (el) => Number(el.getAttribute('data-width') ?? 560),
        renderHTML: (attrs) => ({ 'data-width': String(attrs.width ?? 560) }),
      },
      height: {
        default: 'auto',
        parseHTML: (el) => el.getAttribute('data-height') ?? 'auto',
        renderHTML: (attrs) => ({ 'data-height': String(attrs.height ?? 'auto') }),
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
          const cellData: CellData = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => (r === 0 ? `Header ${c + 1}` : ''))
          );

          return commands.insertContent({
            type: this.name,
            attrs: {
              rows,
              cols,
              cellData: JSON.stringify(cellData),
              theme: JSON.stringify(DEFAULT_CANVAS_TABLE_THEME),
              posX: 0,
              posY: 0,
              width: 560,
              height: 'auto',
            },
          });
        },
    };
  },
});
