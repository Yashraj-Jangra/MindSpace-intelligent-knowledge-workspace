'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { common, createLowlight } from 'lowlight';

import 'katex/dist/katex.min.css';

import {
  ArrowLeft,
  Check,
  Loader2,
  Bell,
  Pin,
  Trash2,
  Tag,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  Network,
  PenTool,
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
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Table as TableIcon,
  Minus,
  RemoveFormatting,
} from 'lucide-react';

import { StoredNote } from '@/lib/notes-storage';
import { ReminderModal } from '../ui/ReminderModal';
import { StylusAnnotationCanvas } from './StylusAnnotationCanvas';
import { StickerPicker } from './StickerPicker';

interface AdvancedNoteEditorProps {
  initialNote: StoredNote;
}

const lowlight = createLowlight(common);

export function AdvancedNoteEditor({ initialNote }: AdvancedNoteEditorProps) {
  const router = useRouter();

  // Note Metadata State
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content || '');
  const [tags, setTags] = useState<string[]>(initialNote.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(initialNote.priority || 'MEDIUM');
  const [isPinned, setIsPinned] = useState(initialNote.isPinned || false);
  const [reminderAt, setReminderAt] = useState<string | null>(initialNote.reminderAt || null);
  const [stylusDrawingData, setStylusDrawingData] = useState<string | null>(null);

  // Editor View Mode & Status
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isConverting, setIsConverting] = useState(false);

  // Modals state
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isStylusOpen, setIsStylusOpen] = useState(false);
  const [isStickerOpen, setIsStickerOpen] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('typescript');

  // Initialize Tiptap Editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      ImageExtension.configure({
        allowBase64: true,
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: "Write your note here or type '/' for formatting commands...",
      }),
      TextStyle,
      Color,
    ],
    content: initialNote.content || '<p></p>',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      setSaveStatus('unsaved');
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[600px] text-base leading-relaxed text-[#FAFAFA] font-sans p-6',
      },
    },
  });

  // Auto-save Debounce
  const saveNote = useCallback(
    async (updatedFields: Partial<StoredNote>) => {
      if (!editor) return;
      setSaveStatus('saving');
      try {
        const htmlContent = editor.getHTML();
        await fetch(`/api/notes/${initialNote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content: htmlContent,
            tags,
            priority,
            isPinned,
            reminderAt,
            ...updatedFields,
          }),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('unsaved');
      }
    },
    [editor, initialNote.id, title, tags, priority, isPinned, reminderAt]
  );

  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      if (saveStatus === 'unsaved') {
        saveNote({});
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editor, saveStatus, saveNote]);

  // Telemetry Calculations
  const plainText = useMemo(() => {
    if (typeof window === 'undefined' || !editor) return content;
    return editor.getText();
  }, [content, editor]);

  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Tag Handlers
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        const nextTags = [...tags, newTag];
        setTags(nextTags);
        saveNote({ tags: nextTags });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    saveNote({ tags: nextTags });
  };

  // Convert to Visual Mind Map Canvas
  const handleConvertToCanvas = async () => {
    setIsConverting(true);
    try {
      const res = await fetch(`/api/notes/${initialNote.id}/convert-canvas`, { method: 'POST' });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to convert note to canvas:', err);
    } finally {
      setIsConverting(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      await fetch(`/api/notes/${initialNote.id}`, { method: 'DELETE' });
      router.push('/dashboard');
    }
  };

  // Image Upload Handler
  const handleOpenImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.url && editor) {
            editor.chain().focus().setImage({ src: data.url }).run();
          }
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
    };
    input.click();
  };

  // Insert Link Prompt
  const handleSetLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter Hyperlink URL:', previousUrl || 'https://');

    if (url === null) return;
    if (url === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const COLOR_OPTIONS = [
    { name: 'Default', hex: '#FAFAFA' },
    { name: 'Vermillion', hex: '#FF3D00' },
    { name: 'Gold', hex: '#FBBC05' },
    { name: 'Emerald', hex: '#34A853' },
    { name: 'Electric Blue', hex: '#4285F4' },
    { name: 'Purple', hex: '#A855F7' },
    { name: 'Rose', hex: '#EC4899' },
  ];

  return (
    <div
      className={`min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans select-text ${
        isZenMode ? 'fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0A]' : ''
      }`}
    >
      {/* Top Header Control Bar */}
      {!isZenMode && (
        <header className="h-16 border-b border-[#262626] bg-[#0A0A0A]/95 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#737373] hover:text-[#FAFAFA] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
              <span>Dashboard</span>
            </button>

            <div className="h-4 w-px bg-[#262626]" />

            {/* Auto-save Status */}
            <div className="flex items-center gap-2 font-mono text-xs">
              {saveStatus === 'saving' ? (
                <span className="flex items-center gap-1 text-[#FF3D00]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : saveStatus === 'saved' ? (
                <span className="flex items-center gap-1 text-[#737373]">
                  <Check className="w-3 h-3 text-[#10b981]" />
                  <span>Saved</span>
                </span>
              ) : (
                <span className="text-[#FF3D00]">Unsaved</span>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-3">
            {/* Priority Selector */}
            <select
              value={priority}
              onChange={(e) => {
                const p = e.target.value as 'LOW' | 'MEDIUM' | 'HIGH';
                setPriority(p);
                saveNote({ priority: p });
              }}
              className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono uppercase px-2.5 py-1.5 text-[#FAFAFA] focus:outline-none"
            >
              <option value="LOW">Priority: Low</option>
              <option value="MEDIUM">Priority: Medium</option>
              <option value="HIGH">Priority: High</option>
            </select>

            {/* Pin Toggle */}
            <button
              onClick={() => {
                const nextPinned = !isPinned;
                setIsPinned(nextPinned);
                saveNote({ isPinned: nextPinned });
              }}
              className={`p-1.5 border transition-colors ${
                isPinned ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title={isPinned ? 'Unpin Note' : 'Pin Note'}
            >
              <Pin className="w-4 h-4 stroke-[1.5]" />
            </button>

            {/* Set Reminder */}
            <button
              onClick={() => setIsReminderOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-colors ${
                reminderAt ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>{reminderAt ? new Date(reminderAt).toLocaleDateString() : 'Remind'}</span>
            </button>

            {/* Open Stylus Canvas */}
            <button
              onClick={() => setIsStylusOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#FF3D00] text-[#FF3D00] hover:bg-[#FF3D00] hover:text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-colors"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Stylus</span>
            </button>

            {/* Convert to Mind Map CTA */}
            <button
              onClick={handleConvertToCanvas}
              disabled={isConverting}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-colors"
            >
              {isConverting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Network className="w-3.5 h-3.5 stroke-[2]" />
              )}
              <span>Convert to Mind Map</span>
            </button>

            {/* Zen Mode Toggle */}
            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className={`p-1.5 border transition-colors ${
                isZenMode ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title={isZenMode ? 'Exit Zen Mode' : 'Zen Focus Mode'}
            >
              {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Delete Note */}
            <button
              onClick={handleDeleteNote}
              className="p-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] transition-colors"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </header>
      )}

      {/* Primary Sticky Formatting Toolbar */}
      {editor && (
        <div className="sticky top-16 z-40 border-b border-[#262626] bg-[#0F0F0F] px-6 py-2 flex items-center justify-between gap-1 overflow-x-auto select-none">
          <div className="flex items-center gap-1 flex-wrap">
            {/* History */}
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

            {/* Heading Dropdown */}
            <div className="flex items-center gap-1 border-r border-[#262626] pr-1.5 mr-1">
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

              {/* Color Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowColorDropdown(!showColorDropdown)}
                  className="p-1.5 text-[#737373] hover:text-[#FF3D00] transition-colors flex items-center gap-1"
                  title="Text Color"
                >
                  <Palette className="w-4 h-4" />
                </button>
                {showColorDropdown && (
                  <div className="absolute top-full left-0 mt-1 z-[100] bg-[#0F0F0F] border border-[#262626] p-2 grid grid-cols-4 gap-1.5 shadow-2xl">
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

              {/* Alignments */}
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

            {/* Structure Group */}
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

            {/* Table Menu */}
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
                <div className="absolute top-full left-0 mt-1 z-[100] bg-[#0F0F0F] border border-[#262626] p-2 flex flex-col space-y-1 shadow-2xl w-48 text-xs font-mono text-[#FAFAFA]">
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

            {/* Code Block */}
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

            {/* Media & Links */}
            <div className="flex items-center gap-0.5">
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
                onClick={handleOpenImageUpload}
                className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
                title="Upload Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsStickerOpen(true)}
                className="p-1.5 text-[#737373] hover:text-[#FF3D00] transition-colors"
                title="Insert Sticker / Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                className="p-1.5 text-[#737373] hover:text-[#FAFAFA] transition-colors"
                title="Clear Formatting"
              >
                <RemoveFormatting className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col space-y-6">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaveStatus('unsaved');
          }}
          placeholder="Note Title..."
          className="w-full bg-transparent font-sans font-black text-4xl sm:text-5xl tracking-tighter text-[#FAFAFA] focus:outline-none placeholder:text-[#262626]"
        />

        {/* Tag Manager Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262626]">
          <Tag className="w-3.5 h-3.5 text-[#FF3D00]" />
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[11px] font-mono text-[#FAFAFA]"
            >
              <span>#{t}</span>
              <button onClick={() => handleRemoveTag(t)} className="hover:text-[#FF3D00] ml-1">
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tag + press enter..."
            className="bg-transparent border-none text-xs font-mono text-[#737373] focus:text-[#FAFAFA] focus:outline-none w-44"
          />
        </div>

        {/* Rebuilt Tiptap Rich Text Workspace */}
        {editor && (
          <div className="border border-[#262626] bg-[#0F0F0F] shadow-2xl relative min-h-[600px] text-[#FAFAFA]">
            {/* Floating Selection Bubble Menu */}
            <BubbleMenu
              editor={editor}
              className="bg-[#0F0F0F] border border-[#262626] shadow-2xl p-1 flex items-center gap-1 text-xs font-mono text-[#FAFAFA]"
            >
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('bold') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('italic') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('underline') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Underline"
              >
                <UnderlineIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('strike') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </BubbleMenu>

            <EditorContent editor={editor} />
          </div>
        )}

        {/* Saved Stylus Drawing Canvas Annotation Preview */}
        {stylusDrawingData && (
          <div className="border border-[#262626] bg-[#0F0F0F] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
              <span>Stylus Drawing Annotation</span>
              <button onClick={() => setStylusDrawingData(null)} className="hover:text-[#FF3D00]">
                Remove Annotation
              </button>
            </div>
            <img
              src={stylusDrawingData}
              alt="Stylus Drawing"
              className="w-full max-h-96 object-contain border border-[#262626] bg-[#0A0A0A]"
            />
          </div>
        )}
      </main>

      {/* Telemetry Status Footer */}
      {!isZenMode && (
        <footer className="h-10 border-t border-[#262626] bg-[#0F0F0F] px-8 flex items-center justify-between font-mono text-[11px] text-[#737373]">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF3D00]" />
              <span>{wordCount} Words</span>
            </span>
            <span>{charCount} Characters</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>~{readingTime} Min Read</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest text-[10px]">Tiptap Rich Suite (MindSpace Dark)</span>
          </div>
        </footer>
      )}

      {/* Stylus Freehand Canvas Modal */}
      <StylusAnnotationCanvas
        isOpen={isStylusOpen}
        onClose={() => setIsStylusOpen(false)}
        initialDrawingData={stylusDrawingData}
        onSaveDrawing={(dataUrl) => setStylusDrawingData(dataUrl)}
      />

      {/* Sticker & Emoji Picker Modal */}
      <StickerPicker
        isOpen={isStickerOpen}
        onClose={() => setIsStickerOpen(false)}
        onSelectSticker={(stickerText) => {
          if (editor) {
            editor.chain().focus().insertContent(` ${stickerText} `).run();
          }
        }}
      />

      {/* Reminder Scheduling Modal */}
      <ReminderModal
        isOpen={isReminderOpen}
        nodeId={initialNote.id}
        nodeLabel={title}
        onClose={() => setIsReminderOpen(false)}
        onConfirm={async (id, dateStr) => {
          setReminderAt(dateStr);
          await saveNote({ reminderAt: dateStr });
        }}
      />
    </div>
  );
}
