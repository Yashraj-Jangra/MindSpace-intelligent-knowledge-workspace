# MindSpace Architecture Plan: Ultra-Advanced Classic Note Editor Suite

Build an ultra-advanced, customizable Classic Note Editor for MindSpace featuring dynamic typography (H1-H6, custom sizes, highlight colors), multi-language syntax-highlighted code blocks, interactive strike-through checklists, clickable links, image & media uploads, sticker/emoji picker, full undo/redo history, mobile virtual keyboard toolbar, HTML5 freehand stylus drawing annotation overlay, customizable dockable toolbar panel, and Zen/Focus writing mode.

---

## User Review Required

> [!IMPORTANT]
> **Editor Architecture**:
> - **Rich Text Engine**: Built on Tiptap (`@tiptap/react`) for production-grade rich text, syntax-highlighted code blocks, task items, images, and links.
> - **Stylus Drawing Annotation**: Integrated HTML5 Canvas overlay layer enabling stylus & touchscreen freehand drawing directly over or within notes.
> - **Customizable Toolbar**: Users can enable/disable specific tool groups and dock the toolbar at the Top, Bottom, or Floating Side.

---

## Proposed Changes

---

### Component 1: Dependencies & Extensible Rich Text Engine

#### [MODIFY] [package.json](file:///d:/Projects/MindSpace/package.json)
- Add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-color`, `@tiptap/extension-text-style`, `@tiptap/extension-underline`, `lowlight`.

---

### Component 2: Freehand Stylus & Pen Canvas Annotation Component

#### [NEW] [StylusAnnotationCanvas.tsx](file:///d:/Projects/MindSpace/src/components/editor/StylusAnnotationCanvas.tsx)
- HTML5 Canvas overlay supporting stylus & pen input.
- Tools: Fine Pen, Marker, Highlighter, Eraser, Clear Canvas.
- Color Palette: Vermillion (`#FF3D00`), White (`#FAFAFA`), Gold (`#FBBC05`), Emerald (`#34A853`), Electric Blue (`#4285F4`).
- Stroke thickness slider & pressure sensitivity API support (`PointerEvent.pressure`).

---

### Component 3: Customizable Dockable Toolbar Panel

#### [NEW] [CustomizableToolbar.tsx](file:///d:/Projects/MindSpace/src/components/editor/CustomizableToolbar.tsx)
- Editable toolbar panel where users can customize which tools appear:
  - **Typography**: Headings (H1-H6), Font Sizes, Bold, Italic, Underline, Strikethrough, Text/Highlight Color.
  - **Structure**: Checklists (strike-through on completion), Bullet list, Numbered list, Blockquotes, Tables.
  - **Code**: Code block with language selector (JS, TS, Python, HTML, SQL, Bash, Rust, C++).
  - **Media & Links**: Hyperlink modal, Image upload, Sticker picker.
  - **Tools**: Stylus Drawing toggle, Undo/Redo, Zen/Focus Mode toggle, Mind Map converter.
- Docking Position selector: `TOP`, `BOTTOM`, `FLOATING_SIDE`.

---

### Component 4: Stickers & Emoji Picker Modal

#### [NEW] [StickerPicker.tsx](file:///d:/Projects/MindSpace/src/components/editor/StickerPicker.tsx)
- Categorized emoji & sticker palette (Badges, Status icons, Reaction stickers, Tech badges) to insert visual accents into notes.

---

### Component 5: Media Upload & MinIO/Base64 API Route

#### [NEW] [/api/upload/route.ts](file:///d:/Projects/MindSpace/src/app/api/upload/route.ts)
- File upload endpoint accepting `.png`, `.jpg`, `.webp`, `.svg`, `.pdf` and returning public URL / local storage path.

---

### Component 6: Suggested Advanced Features Integration

#### [NEW] [AdvancedNoteEditor.tsx](file:///d:/Projects/MindSpace/src/components/editor/AdvancedNoteEditor.tsx)
- Integrates Tiptap engine, Stylus Canvas, Customizable Toolbar, Sticker Picker, Undo/Redo history stack, Live Word & Character Counter, Reading Time estimator, and Zen Mode.
- Bold Typography styling rules (`#0A0A0A` near-black bg, `#FF3D00` vermillion accent, 0px sharp edges, Inter Tight / JetBrains Mono fonts).

#### [MODIFY] [notes/[id]/page.tsx](file:///d:/Projects/MindSpace/src/app/notes/[id]/page.tsx)
- Connects `AdvancedNoteEditor` component to note page route.

---

## Verification Plan

### Automated Verification
1. Install new dependencies:
   ```bash
   npm install
   ```
2. Typecheck TypeScript files:
   ```bash
   npx tsc --noEmit
   ```
3. Test Next.js production build:
   ```bash
   npm run build
   ```

### Manual Verification
1. **Typography & Formatting**: Test H1-H6, font sizes, text highlights, bold, italic, underline, strikethrough.
2. **Interactive Checklists**: Verify checking an item strikes through text.
3. **Syntax Highlighting**: Create code blocks in JS/Python/SQL and verify color formatting.
4. **Media & Stickers**: Upload an image and insert sticker badges into note body.
5. **Stylus Drawing Canvas**: Open Stylus Annotation overlay, draw with pen/highlighter, and verify annotations save with note.
6. **Customizable Toolbar**: Customize tool visibility and test docking toolbar to Top, Bottom, or Floating Side.
7. **Zen Mode & Undo/Redo**: Test full-screen Zen Mode and `Ctrl+Z` / `Ctrl+Y` history stack.
