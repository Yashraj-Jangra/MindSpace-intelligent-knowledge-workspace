'use client';

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Smile,
  PenTool,
  Undo,
  Redo,
  Maximize2,
  Minimize2,
  Settings2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Table as TableIcon,
  Network,
  Minus,
  RemoveFormatting,
  Plus,
  Trash2,
  Subscript as SubIcon,
  Superscript as SuperIcon,
} from 'lucide-react';

export type DockPosition = 'TOP' | 'BOTTOM' | 'FLOATING_SIDE';

interface CustomizableToolbarProps {
  editor: Editor | null;
  dockPosition: DockPosition;
  onPositionChange: (pos: DockPosition) => void;
  onOpenStylus: () => void;
  onOpenStickerPicker: () => void;
  onOpenImageUpload: () => void;
  onToggleZenMode: () => void;
  isZenMode: boolean;
  onConvertToCanvas: () => void;
  isConverting: boolean;
}

const COLOR_OPTIONS = [
  { name: 'Default', hex: '#FAFAFA' },
  { name: 'Vermillion', hex: '#FF3D00' },
  { name: 'Gold', hex: '#FBBC05' },
  { name: 'Emerald', hex: '#34A853' },
  { name: 'Electric Blue', hex: '#4285F4' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Rose', hex: '#EC4899' },
];

export function CustomizableToolbar({
  editor,
  dockPosition,
  onPositionChange,
  onOpenStylus,
  onOpenStickerPicker,
  onOpenImageUpload,
  onToggleZenMode,
  isZenMode,
  onConvertToCanvas,
  isConverting,
}: CustomizableToolbarProps) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('typescript');

  // Tool Group Visibility States
  const [toolVisibility, setToolVisibility] = useState({
    typography: true,
    structure: true,
    table: true,
    code: true,
    media: true,
    tools: true,
  });

  if (!editor) return null;

  // Insert or Edit Hyperlink
  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter Hyperlink URL:', previousUrl || 'https://');

    if (url === null) return;
    if (url === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const getPositionClasses = () => {
    switch (dockPosition) {
      case 'BOTTOM':
        return 'fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-5xl w-[95%] shadow-2xl border border-[#262626] bg-[#0F0F0F] p-2';
      case 'FLOATING_SIDE':
        return 'fixed top-24 right-4 z-40 flex-col max-h-[80vh] shadow-2xl border border-[#262626] bg-[#0F0F0F] p-2 overflow-y-auto';
      case 'TOP':
      default:
        return 'sticky top-16 z-30 border-b border-[#262626] bg-[#0F0F0F] px-4 py-2 w-full';
    }
  };

  return (
    <>
      <div
        className={`${getPositionClasses()} transition-all duration-200 flex items-center justify-between gap-1 overflow-x-auto select-none`}
      >
        <div className={`flex items-center gap-1 ${dockPosition === 'FLOATING_SIDE' ? 'flex-col' : 'flex-wrap'}`}>
          {/* History Actions */}
          <div className="flex items-center gap-0.5 border-r border-[#262626] pr-1.5 mr-1">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 text-[#737373] hover:text-[#FAFAFA] disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 text-[#737373] hover:text-[#FAFAFA] disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Typography Group */}
          {toolVisibility.typography && (
            <div className="flex items-center gap-0.5 border-r border-[#262626] pr-1.5 mr-1 flex-wrap">
              {/* Heading Dropdown */}
              <select
                value={
                  editor.isActive('heading', { level: 1 })
                    ? 'h1'
                    : editor.isActive('heading', { level: 2 })
                    ? 'h2'
                    : editor.isActive('heading', { level: 3 })
                    ? 'h3'
                    : editor.isActive('heading', { level: 4 })
                    ? 'h4'
                    : 'p'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'p') editor.chain().focus().setParagraph().run();
                  else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                  else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                  else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                  else if (val === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
                }}
                className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono text-[#FAFAFA] px-2 py-1 focus:outline-none"
              >
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
              </select>

              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('bold') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('italic') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('underline') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('strike') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>

              {/* Text Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorDropdown(!showColorDropdown)}
                  className="p-1.5 text-[#737373] hover:text-[#FF3D00] transition-colors flex items-center gap-1"
                  title="Text Color"
                >
                  <Palette className="w-4 h-4" />
                </button>
                {showColorDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-[#0F0F0F] border border-[#262626] p-2 grid grid-cols-4 gap-1.5 shadow-2xl">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          editor.chain().focus().setColor(c.hex).run();
                          setShowColorDropdown(false);
                        }}
                        className="w-5 h-5 border border-[#262626] hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Text Alignment */}
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive({ textAlign: 'left' }) ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive({ textAlign: 'center' }) ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive({ textAlign: 'right' }) ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Structure Group */}
          {toolVisibility.structure && (
            <div className="flex items-center gap-0.5 border-r border-[#262626] pr-1.5 mr-1">
              <button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('taskList') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Checklist"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('bulletList') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('orderedList') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('blockquote') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
                title="Horizontal Divider"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Table Tools */}
          {toolVisibility.table && (
            <div className="relative border-r border-[#262626] pr-1.5 mr-1">
              <button
                onClick={() => setShowTableMenu(!showTableMenu)}
                className={`p-1.5 transition-colors ${
                  editor.isActive('table') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Table Tools"
              >
                <TableIcon className="w-4 h-4" />
              </button>

              {showTableMenu && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-[#0F0F0F] border border-[#262626] p-2 flex flex-col space-y-1 shadow-2xl w-48 text-xs font-mono text-[#FAFAFA]">
                  <button
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                      setShowTableMenu(false);
                    }}
                    className="px-2 py-1 hover:bg-[#1A1A1A] text-left text-[#FF3D00]"
                  >
                    + Insert 3x3 Table
                  </button>
                  <div className="h-px bg-[#262626]" />
                  <button
                    onClick={() => {
                      editor.chain().focus().addRowAfter().run();
                      setShowTableMenu(false);
                    }}
                    className="px-2 py-1 hover:bg-[#1A1A1A] text-left"
                  >
                    Add Row Below
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().addColumnAfter().run();
                      setShowTableMenu(false);
                    }}
                    className="px-2 py-1 hover:bg-[#1A1A1A] text-left"
                  >
                    Add Column Right
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteRow().run();
                      setShowTableMenu(false);
                    }}
                    className="px-2 py-1 hover:bg-[#1A1A1A] text-left text-red-400"
                  >
                    Delete Row
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteColumn().run();
                      setShowTableMenu(false);
                    }}
                    className="px-2 py-1 hover:bg-[#1A1A1A] text-left text-red-400"
                  >
                    Delete Column
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setShowTableMenu(false);
                    }}
                    className="px-2 py-1 hover:bg-[#1A1A1A] text-left text-red-400 font-bold"
                  >
                    Delete Entire Table
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Code Group */}
          {toolVisibility.code && (
            <div className="flex items-center gap-1 border-r border-[#262626] pr-1.5 mr-1">
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock({ language: codeLanguage }).run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('codeBlock') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
              <select
                value={codeLanguage}
                onChange={(e) => {
                  setCodeLanguage(e.target.value);
                  if (editor.isActive('codeBlock')) {
                    editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run();
                  }
                }}
                className="bg-[#1A1A1A] border border-[#262626] text-[11px] font-mono text-[#FAFAFA] px-1 py-0.5 focus:outline-none"
              >
                <option value="typescript">TS</option>
                <option value="javascript">JS</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash</option>
              </select>
            </div>
          )}

          {/* Media & Links */}
          {toolVisibility.media && (
            <div className="flex items-center gap-0.5 border-r border-[#262626] pr-1.5 mr-1">
              <button
                onClick={handleSetLink}
                className={`p-1.5 transition-colors ${
                  editor.isActive('link') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Hyperlink"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenImageUpload}
                className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
                title="Upload Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenStickerPicker}
                className="p-1.5 text-[#737373] hover:text-[#FF3D00] transition-colors"
                title="Insert Sticker / Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Special Tools */}
          {toolVisibility.tools && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
                title="Clear Formatting"
              >
                <RemoveFormatting className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenStylus}
                className="flex items-center gap-1 px-2 py-1 border border-[#FF3D00] text-[#FF3D00] text-xs font-mono uppercase tracking-wider hover:bg-[#FF3D00] hover:text-[#0A0A0A] transition-colors"
                title="Open Freehand Stylus Annotation"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stylus</span>
              </button>
              <button
                onClick={onConvertToCanvas}
                disabled={isConverting}
                className="flex items-center gap-1 px-2 py-1 bg-[#FF3D00] text-[#0A0A0A] font-bold text-xs font-mono uppercase tracking-wider hover:bg-[#FAFAFA] transition-colors"
                title="Convert Note to Visual Mind Map"
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mind Map</span>
              </button>
            </div>
          )}
        </div>

        {/* Toolbar Position & Zen Controls */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={onToggleZenMode}
            className={`p-1.5 border transition-colors ${
              isZenMode ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
            title={isZenMode ? 'Exit Zen Mode' : 'Enter Zen Focus Mode'}
          >
            {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className="p-1.5 border border-[#262626] text-[#737373] hover:text-[#FAFAFA] transition-colors"
            title="Docking & Toolbar Preferences"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F0F0F] border border-[#262626] p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#FAFAFA]">
                Toolbar Dock & Visibility Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-[#737373] hover:text-[#FAFAFA]">
                ✕
              </button>
            </div>

            {/* Docking Position Selector */}
            <div className="space-y-2">
              <label className="font-mono text-xs text-[#737373] uppercase tracking-wider block">
                Toolbar Docking Position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['TOP', 'BOTTOM', 'FLOATING_SIDE'] as DockPosition[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => onPositionChange(pos)}
                    className={`py-2 px-3 text-xs font-mono uppercase tracking-wider border transition-colors ${
                      dockPosition === pos
                        ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                        : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Enabled Tool Groups */}
            <div className="space-y-3">
              <label className="font-mono text-xs text-[#737373] uppercase tracking-wider block">
                Enabled Tool Groups
              </label>
              {Object.keys(toolVisibility).map((groupKey) => (
                <label
                  key={groupKey}
                  className="flex items-center justify-between p-2 bg-[#1A1A1A] border border-[#262626] text-xs font-mono text-[#FAFAFA] cursor-pointer"
                >
                  <span className="capitalize">{groupKey} Group</span>
                  <input
                    type="checkbox"
                    checked={toolVisibility[groupKey as keyof typeof toolVisibility]}
                    onChange={(e) => setToolVisibility({ ...toolVisibility, [groupKey]: e.target.checked })}
                    className="accent-[#FF3D00]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
